CREATE OR REPLACE FUNCTION generate_short_url()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW."short_code" :=
        substring(
            md5(random()::text || clock_timestamp()::text)
            FROM 1 FOR 7
        );

    RETURN NEW;
END;
$$;

CREATE TRIGGER set_short_url
BEFORE INSERT ON "urls"
FOR EACH ROW
WHEN (NEW."short_code" IS NULL)
EXECUTE FUNCTION generate_short_url();