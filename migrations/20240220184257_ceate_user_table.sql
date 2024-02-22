-- +goose Up
-- +goose StatementBegin
SELECT 'up SQL query';
-- +goose StatementEnd
CREATE TABLE IF NOT EXISTS public.users (
	id bigserial NOT NULL,
    first_name varchar NOT NULL,
    last_name varchar NOT NULL,
    birthday date NOT NULL,
	gmt_offset float NOT NULL,
	last_run timestamp,
	last_send timestamp,
	CONSTRAINT users_pk PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS users_idx ON public.users USING btree (birthday);

INSERT INTO public.users (first_name, last_name, birthday, gmt_offset)
VALUES
	('Anne', 'Doe', '1993-02-21', 2),
	('Bob', 'Doe', '2002-02-21', 7),
	('Charlie', 'Doe', '1999-02-21', -4),
	('Champ', 'Doe', '1999-02-21', 15),
	('Don', 'Doe', '1993-02-22', 2),
	('Eff', 'Doe', '1993-02-20', 2);

-- +goose Down
-- +goose StatementBegin
SELECT 'down SQL query';
-- +goose StatementEnd
DROP INDEX IF EXISTS users_idx;
DROP TABLE IF EXISTS public.users;