--
-- PostgreSQL database dump
--

\restrict enMp3tZiwMRA98IGajiCMgmyKCorKEgHJ8jVYNZKm0XWeJUJylGkJokbgLtDThU

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.session DROP CONSTRAINT IF EXISTS "session_userId_fkey";
ALTER TABLE IF EXISTS ONLY public.account DROP CONSTRAINT IF EXISTS "account_userId_fkey";
DROP INDEX IF EXISTS public.verification_identifier_idx;
DROP INDEX IF EXISTS public."session_userId_idx";
DROP INDEX IF EXISTS public."account_userId_idx";
ALTER TABLE IF EXISTS ONLY public.verification DROP CONSTRAINT IF EXISTS verification_pkey;
ALTER TABLE IF EXISTS ONLY public."user" DROP CONSTRAINT IF EXISTS user_pkey;
ALTER TABLE IF EXISTS ONLY public."user" DROP CONSTRAINT IF EXISTS user_email_key;
ALTER TABLE IF EXISTS ONLY public.session DROP CONSTRAINT IF EXISTS session_token_key;
ALTER TABLE IF EXISTS ONLY public.session DROP CONSTRAINT IF EXISTS session_pkey;
ALTER TABLE IF EXISTS ONLY public.building_state DROP CONSTRAINT IF EXISTS building_state_pkey;
ALTER TABLE IF EXISTS ONLY public.account DROP CONSTRAINT IF EXISTS account_pkey;
ALTER TABLE IF EXISTS ONLY public._migrations DROP CONSTRAINT IF EXISTS _migrations_pkey;
DROP TABLE IF EXISTS public.verification;
DROP TABLE IF EXISTS public."user";
DROP TABLE IF EXISTS public.session;
DROP TABLE IF EXISTS public.building_state;
DROP TABLE IF EXISTS public.account;
DROP TABLE IF EXISTS public._migrations;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _migrations; Type: TABLE; Schema: public; Owner: sara
--

CREATE TABLE public._migrations (
    name text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public._migrations OWNER TO sara;

--
-- Name: account; Type: TABLE; Schema: public; Owner: sara
--

CREATE TABLE public.account (
    id text NOT NULL,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" text NOT NULL,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp with time zone,
    "refreshTokenExpiresAt" timestamp with time zone,
    scope text,
    password text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public.account OWNER TO sara;

--
-- Name: building_state; Type: TABLE; Schema: public; Owner: sara
--

CREATE TABLE public.building_state (
    id text NOT NULL,
    units jsonb DEFAULT '[]'::jsonb NOT NULL,
    charges jsonb DEFAULT '[]'::jsonb NOT NULL,
    payments jsonb DEFAULT '[]'::jsonb NOT NULL,
    expenses jsonb DEFAULT '[]'::jsonb NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    revision bigint DEFAULT 0 NOT NULL,
    handover_receipts jsonb DEFAULT '[]'::jsonb NOT NULL,
    manager_repayments jsonb DEFAULT '[]'::jsonb NOT NULL
);


ALTER TABLE public.building_state OWNER TO sara;

--
-- Name: session; Type: TABLE; Schema: public; Owner: sara
--

CREATE TABLE public.session (
    id text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    token text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL
);


ALTER TABLE public.session OWNER TO sara;

--
-- Name: user; Type: TABLE; Schema: public; Owner: sara
--

CREATE TABLE public."user" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "emailVerified" boolean NOT NULL,
    image text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    role text DEFAULT 'member'::text NOT NULL
);


ALTER TABLE public."user" OWNER TO sara;

--
-- Name: verification; Type: TABLE; Schema: public; Owner: sara
--

CREATE TABLE public.verification (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.verification OWNER TO sara;

--
-- Data for Name: _migrations; Type: TABLE DATA; Schema: public; Owner: sara
--

COPY public._migrations (name, applied_at) FROM stdin;
0001_auth.sql	2026-09-18 00:19:05.365633+00
0002_building.sql	2026-09-18 00:19:05.385541+00
0004_building_revision.sql	2026-09-18 00:19:05.390143+00
0005_handover_receipts.sql	2026-09-19 19:45:29.692519+00
0006_manager_repayments.sql	2026-09-19 20:16:00.450563+00
\.


--
-- Data for Name: account; Type: TABLE DATA; Schema: public; Owner: sara
--

COPY public.account (id, "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", scope, password, "createdAt", "updatedAt") FROM stdin;
j267GngJgKCwfFoMWtB5TFd45zMqMViT	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG	credential	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG	\N	\N	\N	\N	\N	\N	8e2d2128c673ad90d4c2ad0b9e626e25:21047df03eeb0b795e41d81728f79c80bd8f3de683221eb639c6ded41b316ba0b99514c89085997f1d37dc21ac2fb0eb7edaf54e04ece2bfb21264968155d3f1	2026-09-18 00:20:05.57+00	2026-09-18 00:20:05.57+00
\.


--
-- Data for Name: building_state; Type: TABLE DATA; Schema: public; Owner: sara
--

COPY public.building_state (id, units, charges, payments, expenses, settings, updated_at, revision, handover_receipts, manager_repayments) FROM stdin;
default	[{"id": "9f3e4597-70a6-4b8d-8e40-ead6042e20ec", "note": "", "floor": 1, "phone": "", "number": "۱", "occupied": true, "resident": "خانواده عزیزی", "occupants": 4}, {"id": "9747e6f2-dedd-4518-8731-2dfa4eb263c8", "note": "", "floor": 1, "phone": "", "number": "۲", "occupied": true, "resident": "خانواده عزیزی جدید", "occupants": 2}, {"id": "c8ac2373-7892-4b56-973a-f7940ac177a2", "note": "", "floor": 2, "phone": "", "number": "۳", "occupied": true, "resident": "خانواده جندقی", "occupants": 3}, {"id": "6581682f-6fba-4aee-a49d-f114a103b8ac", "note": "", "floor": 2, "phone": "", "number": "۴", "occupied": true, "resident": "عبدالرضایی", "occupants": 1}, {"id": "caf9aee5-af80-4794-a8de-505dd0d81881", "note": "", "floor": 3, "phone": "", "number": "۵", "occupied": true, "resident": "خانواده خاکپور", "occupants": 2}, {"id": "576d7d5b-d9f4-45af-b0fd-1fb014327509", "note": "", "floor": 3, "phone": "", "number": "۶", "occupied": true, "resident": "خانواده دهقانیان", "occupants": 4}, {"id": "7bfdd750-f22a-4537-95e6-8315e21b5822", "note": "", "floor": 4, "phone": "", "number": "۷", "occupied": true, "resident": "خانواده صادقی پناه", "occupants": 4}, {"id": "9fd6c715-34ef-4c2c-95ed-6f40ec55d9f3", "note": "", "floor": 4, "phone": "", "number": "۸", "occupied": true, "resident": "خانواده سیدنژاد", "occupants": 6}, {"id": "ca9c4d51-83cb-4c90-9e56-3583d54209ca", "note": "", "floor": 5, "phone": "", "number": "۹", "occupied": true, "resident": "خانواده ناصری", "occupants": 4}, {"id": "1fb75a90-1c62-4f84-b888-1b7f16b9874d", "note": "", "floor": 5, "phone": "", "number": "۱۰", "occupied": true, "resident": "خانواده جریانی", "occupants": 5}]	[{"id": "7e0867f7-e0ae-4c89-8f49-971678462e91", "note": "شارژ مرداد ۱٬۴۰۵", "year": 1405, "month": 5, "amount": 1900000, "unitId": "7bfdd750-f22a-4537-95e6-8315e21b5822", "issuedAt": "2026-09-18T00:24:25.215Z"}, {"id": "87e3a987-80fc-4f95-b957-7caa24be64cc", "note": "شارژ مرداد ۱٬۴۰۵", "year": 1405, "month": 5, "amount": 2000000, "unitId": "1fb75a90-1c62-4f84-b888-1b7f16b9874d", "issuedAt": "2026-09-18T00:25:30.181Z"}, {"id": "e4884afd-4fd4-4bf5-99be-460770b7b1c4", "note": "شارژ مرداد ۱٬۴۰۵", "year": 1405, "month": 5, "amount": 1900000, "unitId": "9f3e4597-70a6-4b8d-8e40-ead6042e20ec", "issuedAt": "2026-09-18T00:26:12.256Z"}, {"id": "3ea78c00-1479-43d5-99f4-49f31b83dcae", "note": "شارژ شهریور ۱٬۴۰۵", "year": 1405, "month": 6, "amount": 1900000, "unitId": "9f3e4597-70a6-4b8d-8e40-ead6042e20ec", "issuedAt": "2026-09-18T00:26:27.496Z"}, {"id": "b340cd92-5a11-4c04-b1ac-46ee2959c9d5", "note": "شارژ مهر ۱٬۴۰۵", "year": 1405, "month": 7, "amount": 1900000, "unitId": "9f3e4597-70a6-4b8d-8e40-ead6042e20ec", "issuedAt": "2026-09-18T00:26:41.788Z"}, {"id": "b015a294-8c1a-4b8b-8ed3-c2654095a40d", "note": "شارژ آبان ۱٬۴۰۵", "year": 1405, "month": 8, "amount": 1900000, "unitId": "9f3e4597-70a6-4b8d-8e40-ead6042e20ec", "issuedAt": "2026-09-18T00:27:12.869Z"}, {"id": "81f03255-5b00-42ec-b079-dfe58cc2ad7f", "note": "شارژ مرداد ۱٬۴۰۵", "year": 1405, "month": 5, "amount": 1800000, "unitId": "c8ac2373-7892-4b56-973a-f7940ac177a2", "issuedAt": "2026-09-18T00:29:02.035Z"}, {"id": "4cdf327f-f72d-4ce7-81fe-3dd192cf79e1", "note": "شارژ مرداد ۱٬۴۰۵", "year": 1405, "month": 5, "amount": 1900000, "unitId": "576d7d5b-d9f4-45af-b0fd-1fb014327509", "issuedAt": "2026-09-18T00:30:23.054Z"}, {"id": "9641dd33-adea-4d0b-9fff-d6f7ae34e0c8", "note": "شارژ مرداد ۱٬۴۰۵", "year": 1405, "month": 5, "amount": 1900000, "unitId": "ca9c4d51-83cb-4c90-9e56-3583d54209ca", "issuedAt": "2026-09-18T00:31:09.149Z"}, {"id": "e613e366-1c6d-4376-90d8-cb45a38d18a7", "note": "شارژ مرداد ۱٬۴۰۵", "year": 1405, "month": 5, "amount": 1600000, "unitId": "6581682f-6fba-4aee-a49d-f114a103b8ac", "issuedAt": "2026-09-18T00:31:45.661Z"}, {"id": "a2f525e8-d5ac-469b-98e3-57abe1bcdfca", "note": "شارژ مرداد ۱٬۴۰۵", "year": 1405, "month": 5, "amount": 1700000, "unitId": "caf9aee5-af80-4794-a8de-505dd0d81881", "issuedAt": "2026-09-18T00:33:02.391Z"}, {"id": "f05b19db-f648-4456-98cb-55f948ea9b0b", "note": "شارژ شهریور ۱٬۴۰۵", "year": 1405, "month": 6, "amount": 1700000, "unitId": "9747e6f2-dedd-4518-8731-2dfa4eb263c8", "issuedAt": "2026-09-18T00:51:01.561Z"}, {"id": "833e8f57-511c-4371-af37-8285a37b5bac", "note": "شارژ شهریور ۱٬۴۰۵", "year": 1405, "month": 6, "amount": 1800000, "unitId": "c8ac2373-7892-4b56-973a-f7940ac177a2", "issuedAt": "2026-09-18T00:51:01.561Z"}, {"id": "805473a0-fd25-468a-a18d-f69f19cd0d90", "note": "شارژ شهریور ۱٬۴۰۵", "year": 1405, "month": 6, "amount": 1600000, "unitId": "6581682f-6fba-4aee-a49d-f114a103b8ac", "issuedAt": "2026-09-18T00:51:01.561Z"}, {"id": "c88f028a-09b1-4214-8cda-ebda6c05bfa7", "note": "شارژ شهریور ۱٬۴۰۵", "year": 1405, "month": 6, "amount": 1700000, "unitId": "caf9aee5-af80-4794-a8de-505dd0d81881", "issuedAt": "2026-09-18T00:51:01.561Z"}, {"id": "5aeb1b90-7713-4524-bd52-f2428839ed7c", "note": "شارژ شهریور ۱٬۴۰۵", "year": 1405, "month": 6, "amount": 1900000, "unitId": "576d7d5b-d9f4-45af-b0fd-1fb014327509", "issuedAt": "2026-09-18T00:51:01.561Z"}, {"id": "813db95f-25f8-4a47-a65b-4396b7420cc6", "note": "شارژ شهریور ۱٬۴۰۵", "year": 1405, "month": 6, "amount": 1900000, "unitId": "7bfdd750-f22a-4537-95e6-8315e21b5822", "issuedAt": "2026-09-18T00:51:01.561Z"}, {"id": "22cb08e1-a78b-4284-a0e8-0c2f54b3d499", "note": "شارژ شهریور ۱٬۴۰۵", "year": 1405, "month": 6, "amount": 2100000, "unitId": "9fd6c715-34ef-4c2c-95ed-6f40ec55d9f3", "issuedAt": "2026-09-18T00:51:01.561Z"}, {"id": "c6770d7c-05f2-464e-9f02-27c7521c0285", "note": "شارژ شهریور ۱٬۴۰۵", "year": 1405, "month": 6, "amount": 1900000, "unitId": "ca9c4d51-83cb-4c90-9e56-3583d54209ca", "issuedAt": "2026-09-18T00:51:01.561Z"}, {"id": "3beaf982-efc8-4a29-84fd-31ade0d76fcc", "note": "شارژ شهریور ۱٬۴۰۵", "year": 1405, "month": 6, "amount": 2000000, "unitId": "1fb75a90-1c62-4f84-b888-1b7f16b9874d", "issuedAt": "2026-09-18T00:51:01.561Z"}, {"id": "fd52e017-ab8f-4763-8d60-ca265099c103", "note": "شارژ مرداد ۱٬۴۰۵", "year": 1405, "month": 5, "amount": 1700000, "unitId": "9747e6f2-dedd-4518-8731-2dfa4eb263c8", "issuedAt": "2026-09-18T00:52:08.275Z"}, {"id": "608e967b-c09f-44b8-a927-969dc2072881", "note": "شارژ مرداد ۱٬۴۰۵", "year": 1405, "month": 5, "amount": 2100000, "unitId": "9fd6c715-34ef-4c2c-95ed-6f40ec55d9f3", "issuedAt": "2026-09-18T00:52:08.275Z"}, {"id": "1dad1ee6-e070-4cb8-8b8a-65ada8840419", "note": "شارژ تیر ۱٬۴۰۵", "year": 1405, "month": 4, "amount": 900000, "unitId": "caf9aee5-af80-4794-a8de-505dd0d81881", "issuedAt": "2026-09-18T11:43:28.233Z"}, {"id": "1639ae67-2cd4-430d-bbbc-d954e6055105", "note": "شارژ تیر ۱٬۴۰۵", "year": 1405, "month": 4, "amount": 1100000, "unitId": "9f3e4597-70a6-4b8d-8e40-ead6042e20ec", "issuedAt": "2026-09-18T11:43:35.208Z"}, {"id": "f4f2abfa-64ab-4c5a-8994-b678b52c4a2d", "note": "شارژ تیر ۱٬۴۰۵", "year": 1405, "month": 4, "amount": 1100000, "unitId": "576d7d5b-d9f4-45af-b0fd-1fb014327509", "issuedAt": "2026-09-18T11:43:41.373Z"}, {"id": "0fe67f63-da3a-4355-b73b-cf5641ecbf6c", "note": "شارژ تیر ۱٬۴۰۵", "year": 1405, "month": 4, "amount": 1100000, "unitId": "7bfdd750-f22a-4537-95e6-8315e21b5822", "issuedAt": "2026-09-18T11:43:45.113Z"}, {"id": "43b626e5-2283-4313-b0e6-7e95ff6c2b02", "note": "شارژ تیر ۱٬۴۰۵", "year": 1405, "month": 4, "amount": 1100000, "unitId": "ca9c4d51-83cb-4c90-9e56-3583d54209ca", "issuedAt": "2026-09-18T11:43:48.877Z"}, {"id": "7a393226-24a6-4f3e-8a6c-91c982fd58dc", "note": "شارژ تیر ۱٬۴۰۵", "year": 1405, "month": 4, "amount": 1300000, "unitId": "9fd6c715-34ef-4c2c-95ed-6f40ec55d9f3", "issuedAt": "2026-09-18T11:43:56.406Z"}, {"id": "70a278ee-95b3-453b-ac6d-5672ad42774b", "note": "شارژ مهر ۱٬۴۰۵", "year": 1405, "month": 7, "amount": 1700000, "unitId": "9747e6f2-dedd-4518-8731-2dfa4eb263c8", "issuedAt": "2026-09-23T21:49:10.209Z"}, {"id": "495fe8d9-a2da-41a9-8f93-14b4eecbd87a", "note": "شارژ مهر ۱٬۴۰۵", "year": 1405, "month": 7, "amount": 1800000, "unitId": "c8ac2373-7892-4b56-973a-f7940ac177a2", "issuedAt": "2026-09-23T21:49:10.209Z"}, {"id": "d3493342-b9f8-47a1-acea-ba95a84de843", "note": "شارژ مهر ۱٬۴۰۵", "year": 1405, "month": 7, "amount": 1600000, "unitId": "6581682f-6fba-4aee-a49d-f114a103b8ac", "issuedAt": "2026-09-23T21:49:10.209Z"}, {"id": "67242660-91a6-4cf3-9ef2-5714745b8ea9", "note": "شارژ مهر ۱٬۴۰۵", "year": 1405, "month": 7, "amount": 1700000, "unitId": "caf9aee5-af80-4794-a8de-505dd0d81881", "issuedAt": "2026-09-23T21:49:10.209Z"}, {"id": "8af1d837-3599-4c6a-a2c0-05110118e000", "note": "شارژ مهر ۱٬۴۰۵", "year": 1405, "month": 7, "amount": 1900000, "unitId": "576d7d5b-d9f4-45af-b0fd-1fb014327509", "issuedAt": "2026-09-23T21:49:10.209Z"}, {"id": "0f91e06c-2763-41a3-aa71-e24e9e997a37", "note": "شارژ مهر ۱٬۴۰۵", "year": 1405, "month": 7, "amount": 1900000, "unitId": "7bfdd750-f22a-4537-95e6-8315e21b5822", "issuedAt": "2026-09-23T21:49:10.209Z"}, {"id": "35c75884-1eff-4a60-b002-56c5cb362509", "note": "شارژ مهر ۱٬۴۰۵", "year": 1405, "month": 7, "amount": 2100000, "unitId": "9fd6c715-34ef-4c2c-95ed-6f40ec55d9f3", "issuedAt": "2026-09-23T21:49:10.209Z"}, {"id": "dfb343f7-b6db-44c7-be64-56db5dd41491", "note": "شارژ مهر ۱٬۴۰۵", "year": 1405, "month": 7, "amount": 1900000, "unitId": "ca9c4d51-83cb-4c90-9e56-3583d54209ca", "issuedAt": "2026-09-23T21:49:10.209Z"}, {"id": "b9a37a2c-6f63-4640-bbde-9b76a6136091", "note": "شارژ مهر ۱٬۴۰۵", "year": 1405, "month": 7, "amount": 2000000, "unitId": "1fb75a90-1c62-4f84-b888-1b7f16b9874d", "issuedAt": "2026-09-23T21:49:10.209Z"}]	[{"id": "4360d47c-5ad2-4c6e-b328-3737209d6c56", "date": "2026-08-16T08:30:00.000Z", "note": "", "year": 1405, "month": 4, "amount": 1100000, "method": "card", "unitId": "7bfdd750-f22a-4537-95e6-8315e21b5822"}, {"id": "e43574b7-a6a6-4e7b-b61f-05fccd2e4676", "date": "2026-08-16T08:30:00.000Z", "note": "تسویه کامل", "year": 1405, "month": 5, "amount": 1900000, "method": "card", "unitId": "7bfdd750-f22a-4537-95e6-8315e21b5822"}, {"id": "068b1a36-7cde-4868-9105-fda035db896d", "date": "2026-08-17T08:30:00.000Z", "note": "", "year": 1405, "month": 5, "amount": 2000000, "method": "card", "unitId": "1fb75a90-1c62-4f84-b888-1b7f16b9874d"}, {"id": "391b0d2c-5d1b-49b5-905e-4a0e877f2201", "date": "2026-08-17T08:30:00.000Z", "note": "به حساب قبض آب مشاع که ساکن خودش پرداخت کرد — پولی به کارت واریز نشده", "year": 1405, "month": 4, "amount": 1100000, "method": "cash", "unitId": "9f3e4597-70a6-4b8d-8e40-ead6042e20ec", "notReachedFund": true}, {"id": "7445938f-fa6f-48d4-ad91-94b0321d9a69", "date": "2026-08-17T08:30:00.000Z", "note": "به حساب قبض آب مشاع که ساکن خودش پرداخت کرد — پولی به کارت واریز نشده", "year": 1405, "month": 5, "amount": 1900000, "method": "cash", "unitId": "9f3e4597-70a6-4b8d-8e40-ead6042e20ec", "notReachedFund": true}, {"id": "77dace81-83d2-4d2d-9fc3-c397ab0eeca6", "date": "2026-08-17T08:30:00.000Z", "note": "به حساب قبض آب مشاع که ساکن خودش پرداخت کرد — پولی به کارت واریز نشده", "year": 1405, "month": 6, "amount": 1900000, "method": "cash", "unitId": "9f3e4597-70a6-4b8d-8e40-ead6042e20ec", "notReachedFund": true}, {"id": "831d36e1-12b2-4e1e-99d8-e64c13974838", "date": "2026-08-17T08:30:00.000Z", "note": "به حساب قبض آب مشاع که ساکن خودش پرداخت کرد — پولی به کارت واریز نشده", "year": 1405, "month": 7, "amount": 1900000, "method": "cash", "unitId": "9f3e4597-70a6-4b8d-8e40-ead6042e20ec", "notReachedFund": true}, {"id": "b92620ed-3015-406d-b2ba-2f0c54468c49", "date": "2026-08-17T08:30:00.000Z", "note": "به حساب قبض آب مشاع که ساکن خودش پرداخت کرد — پولی به کارت واریز نشده", "year": 1405, "month": 8, "amount": 1236200, "method": "cash", "unitId": "9f3e4597-70a6-4b8d-8e40-ead6042e20ec", "notReachedFund": true}, {"id": "f47cab18-0299-4439-8916-48d45de10924", "date": "2026-08-17T08:30:00.000Z", "note": "", "year": 1405, "month": 5, "amount": 1800000, "method": "card", "unitId": "c8ac2373-7892-4b56-973a-f7940ac177a2"}, {"id": "f3fcd90d-48e9-4586-9350-98793a5463ed", "date": "2026-08-18T08:30:00.000Z", "note": "", "year": 1405, "month": 4, "amount": 1100000, "method": "card", "unitId": "576d7d5b-d9f4-45af-b0fd-1fb014327509"}, {"id": "49ffcdb6-259e-4d9b-a3cb-85a1da4713c3", "date": "2026-08-18T08:30:00.000Z", "note": "", "year": 1405, "month": 5, "amount": 1900000, "method": "card", "unitId": "576d7d5b-d9f4-45af-b0fd-1fb014327509"}, {"id": "86ab1145-cb75-49bb-9c89-ad68d279f8f5", "date": "2026-08-23T08:30:00.000Z", "note": "", "year": 1405, "month": 4, "amount": 1100000, "method": "card", "unitId": "ca9c4d51-83cb-4c90-9e56-3583d54209ca"}, {"id": "1476f275-d88a-4ba3-853e-7adecee13c24", "date": "2026-08-23T08:30:00.000Z", "note": "", "year": 1405, "month": 5, "amount": 1900000, "method": "card", "unitId": "ca9c4d51-83cb-4c90-9e56-3583d54209ca"}, {"id": "35c40062-273e-496b-9156-32fc594624d7", "date": "2026-08-23T08:30:00.000Z", "note": "", "year": 1405, "month": 5, "amount": 1600000, "method": "card", "unitId": "6581682f-6fba-4aee-a49d-f114a103b8ac"}, {"id": "5c78eba3-4ad8-4cf3-bf37-c49578374f1b", "date": "2026-08-27T08:30:00.000Z", "note": "", "year": 1405, "month": 4, "amount": 800000, "method": "card", "unitId": "caf9aee5-af80-4794-a8de-505dd0d81881"}, {"id": "eb7635fd-1794-44cf-bdd1-8386b678b26d", "date": "2026-08-27T08:30:00.000Z", "note": "", "year": 1405, "month": 5, "amount": 1700000, "method": "card", "unitId": "caf9aee5-af80-4794-a8de-505dd0d81881"}, {"id": "4c69c85c-3247-4d5a-b9fb-5e1b32cd0786", "date": "2026-09-19T08:30:00.000Z", "note": "", "year": 1405, "month": 6, "amount": 1700000, "method": "card", "unitId": "caf9aee5-af80-4794-a8de-505dd0d81881", "pendingHandover": false}, {"id": "8d2b6a8e-f12c-4fd0-8ff1-1591ae7c2ce4", "date": "2026-09-19T08:30:00.000Z", "note": "بدهی و ذخیره از ماه های گذشته پرداخت شد", "year": 1405, "month": 4, "amount": 1200000, "method": "card", "unitId": "caf9aee5-af80-4794-a8de-505dd0d81881", "pendingHandover": false}, {"id": "6b4b4745-53f0-4751-8211-26781495a407", "date": "2026-09-22T08:30:00.000Z", "note": "واریز 18,000,000 ریال — 1405/06/31 ساعت 11:38 (پیامک بانک)", "year": 1405, "month": 6, "amount": 1800000, "method": "card", "unitId": "c8ac2373-7892-4b56-973a-f7940ac177a2"}, {"id": "4ca651d6-6c8c-41a5-ad85-7976e895553e", "date": "2026-09-24T08:30:00.000Z", "note": "واریز 19,000,000 ریال — 1405/07/02 (پیامک بانک)", "year": 1405, "month": 6, "amount": 1900000, "method": "card", "unitId": "576d7d5b-d9f4-45af-b0fd-1fb014327509"}, {"id": "f406e922-23c7-44c6-938d-215a2b7f6fc5", "date": "2026-09-24T08:30:00.000Z", "note": "واریز 19,000,000 ریال — 1405/07/02 (پیامک بانک)", "year": 1405, "month": 6, "amount": 1900000, "method": "card", "unitId": "ca9c4d51-83cb-4c90-9e56-3583d54209ca"}, {"id": "c1a1bcc7-4d43-48c2-bec8-91169a86e93b", "date": "2026-09-21T08:30:00.000Z", "note": "واریز 7,000,000 ریال — 1405/06/30 ساعت 15:13 (پیامک بانک)", "year": 1405, "month": 6, "amount": 700000, "method": "card", "unitId": "6581682f-6fba-4aee-a49d-f114a103b8ac"}, {"id": "9b98fa1f-8d10-43aa-84ff-3ef0389b55e5", "date": "2026-09-21T08:30:00.000Z", "note": "واریز 9,000,000 ریال — 1405/06/30 ساعت 15:32 (پیامک بانک)", "year": 1405, "month": 6, "amount": 900000, "method": "card", "unitId": "6581682f-6fba-4aee-a49d-f114a103b8ac"}]	[{"id": "a23547ad-82bf-4ef8-b70f-74e8ca80c44a", "date": "2026-08-06T08:30:00.000Z", "note": "خانواده عزیزی (واحد ۱) مستقیم پرداخت کرد و به حساب شارژشان گذاشته شد — از کارت برداشت نشده", "title": "قبض اب مشاع", "amount": 9936200, "vendor": "", "category": "water", "notFromFund": true}, {"id": "2159a3da-967f-492f-8f20-a3b166950176", "date": "2026-08-19T08:30:00.000Z", "note": "اصلاح طبق صورت‌حساب بانک: 18,042,000 ریال (قبلاً 731,800 تومان ثبت شده بود)", "title": "قبض برق مشاع", "amount": 1804200, "vendor": "", "category": "electricity"}, {"id": "5a389bdd-772d-496e-909e-50828a7248b7", "date": "2026-09-23T08:30:00.000Z", "note": "", "title": "شارژ ماه شهریور به هیئت مدیره", "amount": 8000000, "vendor": "شاکری(هیئت مدیره)", "category": "other"}, {"id": "381b660e-fe23-4c9b-a9cb-2a5bc45248d5", "date": "2026-08-23T08:30:00.000Z", "note": "80,000,000 ریال در دو برداشت: 70,000,000 ریال (1405/06/01 ساعت 00:58) + 10,000,000 ریال (1405/06/28 ساعت 14:20)", "title": "شارژ ماه مرداد به هیئت مدیره", "amount": 8000000, "vendor": "هیئت مدیره", "category": "other"}, {"id": "12c74ca2-b536-4249-bdf1-2b643fd9a0f8", "date": "2026-09-22T08:30:00.000Z", "note": "جمع کارمزدهای شهریور: 102,700 ریال", "title": "کارمزد بانکی شهریور", "amount": 10270, "vendor": "بانک رسالت", "category": "other"}, {"id": "1aa6f0de-d6a3-470a-a65a-e6cc22445b59", "date": "2026-09-01T08:30:00.000Z", "note": "برداشت 8,000,000 ریال در شهریور (یکی از دو برداشت 06/10 ساعت 14:43 یا 06/28 ساعت 20:53)", "title": "نظافت ساختمان", "amount": 800000, "vendor": "", "category": "cleaning"}, {"id": "29c69167-7704-4d7d-8828-c6b1e148b912", "date": "2026-09-01T08:30:00.000Z", "note": "برداشت 4,473,000 ریال — 1405/06/10 ساعت 14:26", "title": "خرید وایتکس و مواد شوینده", "amount": 447300, "vendor": "", "category": "cleaning"}, {"id": "d47b9a29-67ad-4b56-a3a6-1197224fda80", "date": "2026-09-24T08:30:00.000Z", "note": "35,500 کارمزد انتقال به هیئت مدیره (07/01) + 39,000 پیامک تیر (07/02) = 74,500 ریال", "title": "کارمزد بانکی و پیامک مهر", "amount": 7450, "vendor": "بانک رسالت", "category": "other"}]	{"bank": "", "address": "", "manager": "", "perPerson": 100000, "baseCharge": 1500000, "cardNumber": "", "buildingName": "سرا", "managerDebtToFund": 14302782, "previousManagerReceivable": 0}	2026-09-25 01:39:16.47052+00	122	[{"id": "e334972b-2603-4286-8346-349af5295196", "date": "2026-09-19T08:30:00.000Z", "note": "", "amount": 7000000}, {"id": "05f14702-6810-4299-b3c3-33980762a696", "date": "2026-08-15T08:30:00.000Z", "note": "موجودی کارت ساختمان قبل از شروع سرا (266,324 ریال) — مانده از دورهٔ قبل", "amount": 26632.4}]	[]
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: sara
--

COPY public.session (id, "expiresAt", token, "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") FROM stdin;
WycyfGW1bOyH1pcRVi9e68yR3ERLdbLR	2026-09-25 01:02:10.074+00	PbWEPkJo6lIGQ1HabAgk4pjs2fnd7c3q	2026-09-18 01:02:10.074+00	2026-09-18 01:02:10.074+00		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.7922.34 Safari/537.36	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
VE8nquWrsy1i2A5Ql2nJEC52PKRoICKF	2026-09-25 01:02:45.228+00	Pu6W6H7y85vtDHqvt4LnxrvIR0l4P0sK	2026-09-18 01:02:45.228+00	2026-09-18 01:02:45.228+00		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.7922.34 Safari/537.36	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
P3Xyq9A1OIsCqKTEeLSlz2Bo8oDKzhN5	2026-09-25 01:03:42.025+00	M1xhNpznpdefFFoGPScl1Sw8zEo3ufmH	2026-09-18 01:03:42.025+00	2026-09-18 01:03:42.025+00		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.7922.34 Safari/537.36	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
PklTSUQl9EEqAgH0ipbnYGulHf79YerT	2026-09-25 01:13:40.791+00	M1c9UTde7v1GoqKV6fDEFiftZYaLkdUR	2026-09-18 01:13:40.791+00	2026-09-18 01:13:40.791+00		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.7922.34 Safari/537.36	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
ekd99XMe9WdzVGjYZhelDxpm0MCcwYD6	2026-09-25 01:14:18.563+00	cV8crDMycDouKUH9CxeM5GrDJcJftZTN	2026-09-18 01:14:18.563+00	2026-09-18 01:14:18.563+00		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.7922.34 Safari/537.36	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
ZwIPgV9HRYdZFKaX8wv135F7KDuMo3Dh	2026-09-25 01:14:51.577+00	JxKQdzLNIZGJZPwUDICSVrU0F7g2xKyd	2026-09-18 01:14:51.577+00	2026-09-18 01:14:51.577+00		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.7922.34 Safari/537.36	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
KN6XF5VMWrvtXrfMuXoO5DnbwMOSeK9I	2026-09-25 01:15:22.277+00	kjmOfSYuQCKCHlamTYoR77ceb9XT3hN8	2026-09-18 01:15:22.277+00	2026-09-18 01:15:22.277+00		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.7922.34 Safari/537.36	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
nX5npNnPMlZiZBncGRQglKtyRbxODbha	2026-09-25 01:15:33.479+00	Y1ZXpCHBMGrCzXsiLOTt13M2okTGVJML	2026-09-18 01:15:33.479+00	2026-09-18 01:15:33.479+00		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.7922.34 Safari/537.36	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
LxBJhIifCgQqXcSGjgkllW4mBTYWBRC8	2026-09-25 01:16:07.324+00	KTOTiatvNo0DexKGBpwwkW6n5666qUWu	2026-09-18 01:16:07.324+00	2026-09-18 01:16:07.324+00		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.7922.34 Safari/537.36	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
5cEslKZbQtII60hp6jfqb0nM5ebYubJJ	2026-09-25 01:16:19.907+00	6ahAjnfS3Wlwrs9T7aueXROvwvug2DXK	2026-09-18 01:16:19.907+00	2026-09-18 01:16:19.907+00		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.7922.34 Safari/537.36	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
152cp4qWQif4RdtUH5xTY9aEp1du6CyF	2026-09-25 01:16:57.677+00	LOHMFCzFnO8j8y5JUUZwE4HMkTeanU2u	2026-09-18 01:16:57.677+00	2026-09-18 01:16:57.677+00		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.7922.34 Safari/537.36	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
pktQTNwDgYG33f4Tie3jGsw19MZXfGWy	2026-09-25 01:17:47.14+00	vCwAHjIwy0SGmNoUebpM2ZyT0vw5oZlz	2026-09-18 01:17:47.14+00	2026-09-18 01:17:47.14+00		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.7922.34 Safari/537.36	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
nTjMcFyD4n2I4tp38svkhNU8ESWSH6iX	2026-09-25 01:18:12.237+00	hJ4kMf1zsWHSjhmKj6PaFckHYGbA8DKr	2026-09-18 01:18:12.237+00	2026-09-18 01:18:12.237+00		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/151.0.7922.34 Safari/537.36	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
qOxehYzYcrp4tz9MdhXzwnBSZQURZOtQ	2026-09-25 03:04:05.924+00	T4ss1k9paKwIMe60ePdP2Ue3VymqoyhN	2026-09-18 03:04:05.924+00	2026-09-18 03:04:05.924+00		curl/8.22.0	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
y09bN4ti5gyzHzM4s0FP3WWBtslGGUiL	2026-09-25 03:08:58.926+00	gdosjjPpfXg3rdo8RHKMRIBGkCOxl8UA	2026-09-18 03:08:58.926+00	2026-09-18 03:08:58.926+00		curl/8.22.0	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
soEBtY45UHukeYuZLmuPNfdBP87jLD6v	2026-09-25 03:10:59.649+00	wWiInkRmHglJGKTpHHzFZoLgfvPtwlaX	2026-09-18 03:10:59.649+00	2026-09-18 03:10:59.649+00		curl/8.22.0	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
powegSBEAA8uCPWEZ9xAjEVeFNGgr94a	2026-09-25 03:10:59.737+00	wF95B3SBQ8rtEOBhUtLrwKk6q8FrGq8D	2026-09-18 03:10:59.737+00	2026-09-18 03:10:59.737+00		curl/8.22.0	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
wIbTGoI6lv9itscOSe3IpbAqUO6dNisu	2026-09-25 03:15:15.291+00	qvpdA96GuNi7cpbuQ707LHL8yVsiCXEw	2026-09-18 03:15:15.291+00	2026-09-18 03:15:15.291+00		Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
WvsrCEo0QV9NpdEHGFoJPljbKnaJFGSg	2026-09-25 03:15:37.644+00	szEXkW2QJQ7brsQPrG44K89wrix5Me9p	2026-09-18 03:15:37.644+00	2026-09-18 03:15:37.644+00		Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
D9z9FB3bLWc2LS7LXlIdmfpoIVzChY4C	2026-09-25 03:15:59.702+00	zcbQ37VUkMLQRvEREmfIh4s7nBSvTLCI	2026-09-18 03:15:59.702+00	2026-09-18 03:15:59.702+00		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
opoRCVyUgjdZsRc6ehKmpHEK2NTX4NpT	2026-09-25 03:18:09.662+00	8DE7DFmxdju0kPEnO9VE5Dn5woLInxT2	2026-09-18 03:18:09.662+00	2026-09-18 03:18:09.662+00		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
CP49IThKXJHi7Dash9nTgS078OxVbrjR	2026-09-25 03:18:38.112+00	nzHYOdZ5dPB5O0pMyPpom2bqdE06ICxK	2026-09-18 03:18:38.112+00	2026-09-18 03:18:38.112+00		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
NtkFkRoOrqPfcBBn05bDITLeXMWhaKvX	2026-09-25 03:19:03.352+00	i3Wq1WbsEMXeuiUBkJ92ukT8O1QtgQ8l	2026-09-18 03:19:03.352+00	2026-09-18 03:19:03.352+00		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
eErQB417ML9NiGUqjh6lHGTvSkVGBI0N	2026-09-25 03:19:25.065+00	IpKctTzR6TSTtHOZfYo1ZPF2rz1cwNvc	2026-09-18 03:19:25.066+00	2026-09-18 03:19:25.066+00		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
4nHwaCpE4qsr91zS7hjiFGr8icMvaUbg	2026-09-25 03:22:12.078+00	ibnXfVexYop76eWvUCmxqQzaMwGrAOaV	2026-09-18 03:22:12.078+00	2026-09-18 03:22:12.078+00		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
bAbo29k1FuNHVztrBuyXjjwjFJnMyFYg	2026-09-25 11:34:57.656+00	wY3t2JIxdMvFzg38V5XWDhLL6IZyxR4i	2026-09-18 11:34:57.656+00	2026-09-18 11:34:57.656+00		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
0VJC0iXmHYwxrk29arVtT332yzJ6AVfV	2026-09-30 21:49:14.739+00	PE7dX6P9QrjWziVdMwDazuXTTDtuOcMv	2026-09-18 03:41:01.634+00	2026-09-23 21:49:14.739+00		Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
SLW5sKZGn9NM7tgAB2oxQ5lJ7CsjoDCD	2026-10-06 18:37:29.206+00	0De67JX6GWVstiqc08VJ1c2hQ52XbduM	2026-09-18 11:25:54.778+00	2026-09-29 18:37:29.206+00		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
wmpcghLnYmJUoIPcLo1N1dscfvfc7B6H	2026-10-24 22:40:34.754+00	J69yvuglnQwvHlQ6RwGwtMTAV4zuI7D2	2026-10-17 22:40:34.755+00	2026-10-17 22:40:34.755+00		Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36	aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: sara
--

COPY public."user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt", role) FROM stdin;
aQt2GcSp9xPq5ti1ByqagFiTKNNWDqFG	مدیر	mortezautacmatin@gmail.com	f	\N	2026-09-18 00:20:05.566+00	2026-09-18 00:20:05.566+00	admin
\.


--
-- Data for Name: verification; Type: TABLE DATA; Schema: public; Owner: sara
--

COPY public.verification (id, identifier, value, "expiresAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: _migrations _migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: sara
--

ALTER TABLE ONLY public._migrations
    ADD CONSTRAINT _migrations_pkey PRIMARY KEY (name);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: sara
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: building_state building_state_pkey; Type: CONSTRAINT; Schema: public; Owner: sara
--

ALTER TABLE ONLY public.building_state
    ADD CONSTRAINT building_state_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: sara
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: session session_token_key; Type: CONSTRAINT; Schema: public; Owner: sara
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_token_key UNIQUE (token);


--
-- Name: user user_email_key; Type: CONSTRAINT; Schema: public; Owner: sara
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_key UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: sara
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: public; Owner: sara
--

ALTER TABLE ONLY public.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);


--
-- Name: account_userId_idx; Type: INDEX; Schema: public; Owner: sara
--

CREATE INDEX "account_userId_idx" ON public.account USING btree ("userId");


--
-- Name: session_userId_idx; Type: INDEX; Schema: public; Owner: sara
--

CREATE INDEX "session_userId_idx" ON public.session USING btree ("userId");


--
-- Name: verification_identifier_idx; Type: INDEX; Schema: public; Owner: sara
--

CREATE INDEX verification_identifier_idx ON public.verification USING btree (identifier);


--
-- Name: account account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sara
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: session session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sara
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict enMp3tZiwMRA98IGajiCMgmyKCorKEgHJ8jVYNZKm0XWeJUJylGkJokbgLtDThU

