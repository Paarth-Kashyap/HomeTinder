drop extension if exists "pg_net";

revoke delete on table "public"."properties" from "anon";

revoke insert on table "public"."properties" from "anon";

revoke references on table "public"."properties" from "anon";

revoke select on table "public"."properties" from "anon";

revoke trigger on table "public"."properties" from "anon";

revoke truncate on table "public"."properties" from "anon";

revoke update on table "public"."properties" from "anon";

revoke delete on table "public"."properties" from "authenticated";

revoke insert on table "public"."properties" from "authenticated";

revoke references on table "public"."properties" from "authenticated";

revoke select on table "public"."properties" from "authenticated";

revoke trigger on table "public"."properties" from "authenticated";

revoke truncate on table "public"."properties" from "authenticated";

revoke update on table "public"."properties" from "authenticated";

revoke delete on table "public"."properties" from "service_role";

revoke insert on table "public"."properties" from "service_role";

revoke references on table "public"."properties" from "service_role";

revoke select on table "public"."properties" from "service_role";

revoke trigger on table "public"."properties" from "service_role";

revoke truncate on table "public"."properties" from "service_role";

revoke update on table "public"."properties" from "service_role";

revoke delete on table "public"."users" from "anon";

revoke insert on table "public"."users" from "anon";

revoke references on table "public"."users" from "anon";

revoke select on table "public"."users" from "anon";

revoke trigger on table "public"."users" from "anon";

revoke truncate on table "public"."users" from "anon";

revoke update on table "public"."users" from "anon";

revoke delete on table "public"."users" from "authenticated";

revoke insert on table "public"."users" from "authenticated";

revoke references on table "public"."users" from "authenticated";

revoke select on table "public"."users" from "authenticated";

revoke trigger on table "public"."users" from "authenticated";

revoke truncate on table "public"."users" from "authenticated";

revoke update on table "public"."users" from "authenticated";

revoke delete on table "public"."users" from "service_role";

revoke insert on table "public"."users" from "service_role";

revoke references on table "public"."users" from "service_role";

revoke select on table "public"."users" from "service_role";

revoke trigger on table "public"."users" from "service_role";

revoke truncate on table "public"."users" from "service_role";

revoke update on table "public"."users" from "service_role";

alter table "public"."properties" alter column "mls_number" set not null;

CREATE UNIQUE INDEX properties_mls_number_key ON public.properties USING btree (mls_number);

alter table "public"."properties" add constraint "properties_mls_number_key" UNIQUE using index "properties_mls_number_key";


