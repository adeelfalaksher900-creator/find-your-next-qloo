-- Dedicated encrypted collections. Browser roles cannot read these tables.
create table public.collection_vaults (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  token_hash text not null check (token_hash ~ '^[a-f0-9]{64}$'),
  payload jsonb not null check (octet_length(payload::text) <= 270000),
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  window_start timestamptz not null default date_trunc('hour',now()),
  requests integer not null default 1 check (requests >= 0)
);
create table public.collection_budget (
  singleton boolean primary key default true check (singleton),
  day date not null default current_date,
  creations integer not null default 0 check (creations >= 0)
);
insert into public.collection_budget(singleton) values(true);
alter table public.collection_vaults enable row level security;
alter table public.collection_budget enable row level security;
revoke all on public.collection_vaults,public.collection_budget from public,anon,authenticated;
grant select,insert,update,delete on public.collection_vaults,public.collection_budget to service_role;

create function public.collection_exchange(p_id text,p_token_hash text,p_action text,p_expected integer default 0,p_payload jsonb default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v public.collection_vaults%rowtype;
  b public.collection_budget%rowtype;
  window_now timestamptz := date_trunc('hour',now());
begin
  if p_id is null or p_id !~ '^[a-f0-9]{64}$' or p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' or p_action is null or p_action not in ('get','put','delete') or p_expected is null or p_expected < 0 then
    return jsonb_build_object('status',400,'error','Invalid collection request.');
  end if;
  if p_action='put' and not coalesce(jsonb_typeof(p_payload)='object' and p_payload->'v'='1'::jsonb and jsonb_typeof(p_payload->'iv')='string' and p_payload->>'iv' ~ '^[A-Za-z0-9_-]{16}$' and jsonb_typeof(p_payload->'ciphertext')='string' and length(p_payload->>'ciphertext') between 22 and 266800 and p_payload->>'ciphertext' ~ '^[A-Za-z0-9_-]+$' and octet_length(p_payload::text)<=270000,false) then
    return jsonb_build_object('status',400,'error','Invalid encrypted collection.');
  end if;
  -- Serialize creation before the record lookup; updates use the row lock only.
  if p_action='put' and p_expected=0 then
    select * into b from public.collection_budget where singleton=true for update;
  end if;
  select * into v from public.collection_vaults where id=p_id for update;
  if not found then
    if p_action<>'put' or p_expected<>0 then
      return jsonb_build_object('status',404,'error','Collection not found or sync key invalid.');
    end if;
    if b.day<>current_date then
      update public.collection_budget set day=current_date,creations=0 where singleton=true returning * into b;
    end if;
    if b.creations>=100 or (select count(*) from public.collection_vaults)>=500 then
      return jsonb_build_object('status',429,'error','Cloud collection capacity is currently reached. Try again later.');
    end if;
    insert into public.collection_vaults(id,token_hash,payload) values(p_id,p_token_hash,p_payload) returning * into v;
    update public.collection_budget set creations=creations+1 where singleton=true;
    return jsonb_build_object('status',201,'revision',v.revision,'box',v.payload,'updatedAt',v.updated_at);
  end if;
  if v.token_hash<>p_token_hash then
    return jsonb_build_object('status',404,'error','Collection not found or sync key invalid.');
  end if;
  if v.window_start<window_now then v.requests:=0; end if;
  if v.requests>=240 then
    return jsonb_build_object('status',429,'error','This collection has reached its hourly sync limit. Try again later.');
  end if;
  update public.collection_vaults set requests=v.requests+1,window_start=window_now where id=p_id;
  if p_action='get' then
    return jsonb_build_object('status',200,'revision',v.revision,'box',v.payload,'updatedAt',v.updated_at);
  end if;
  if p_expected<>v.revision then
    return jsonb_build_object('status',409,'error','Collection changed on another device.');
  end if;
  if p_action='delete' then
    delete from public.collection_vaults where id=p_id;
    return jsonb_build_object('status',204);
  end if;
  update public.collection_vaults set payload=p_payload,revision=revision+1,updated_at=now() where id=p_id returning * into v;
  return jsonb_build_object('status',200,'revision',v.revision,'box',v.payload,'updatedAt',v.updated_at);
end;
$$;
revoke all on function public.collection_exchange(text,text,text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.collection_exchange(text,text,text,integer,jsonb) to service_role;
