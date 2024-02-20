-- +goose Up
-- +goose StatementBegin
SELECT 'up SQL query';
-- +goose StatementEnd
CREATE TABLE public.bid (
	id bigserial NOT NULL,
	item_id int8 NOT NULL,
	user_id int8 NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	amount int8 NOT NULL,
	is_active bool NOT NULL DEFAULT true,
	is_returned bool NOT NULL DEFAULT false,
	is_paid bool NOT NULL DEFAULT false,
	CONSTRAINT bid_pk PRIMARY KEY (id)
);

CREATE INDEX bid_item_id_idx ON public.bid USING btree (item_id, is_active, is_returned);

-- public.item definition
-- Drop table
-- DROP TABLE public.item;
CREATE TABLE public.item (
	id bigserial NOT NULL,
	"name" varchar NOT NULL,
	start_price int8 NOT NULL,
	time_window int8 NOT NULL,
	started_at timestamptz NULL,
	status varchar NOT NULL DEFAULT 'draft' :: character varying,
	created_by int8 NULL,
	winner_bid_id int8 NULL,
	CONSTRAINT item_pk PRIMARY KEY (id)
);

CREATE INDEX item_status_idx ON public.item USING btree (status);

CREATE INDEX item_winner_bid_id_idx ON public.item USING btree (winner_bid_id);

-- public."user" definition
-- Drop table
-- DROP TABLE public."user";
CREATE TABLE public."user" (
	id bigserial NOT NULL,
	email varchar NOT NULL,
	"password" varchar NOT NULL,
	username varchar NOT NULL,
	is_verified bool NOT NULL DEFAULT false,
	balance int8 NOT NULL DEFAULT 0,
	CONSTRAINT user_pk PRIMARY KEY (id)
);


-- +goose Down
-- +goose StatementBegin
SELECT 'down SQL query';
-- +goose StatementEnd
