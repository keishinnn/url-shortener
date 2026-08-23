CREATE OR REPLACE FUNCTION generate_short_url()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    generated_code VARCHAR(10);
BEGIN
    LOOP
        generated_code :=
            substring(
                md5(random()::text || clock_timestamp()::text)
                FROM 1 FOR 7
            );

        EXIT WHEN NOT EXISTS (
            SELECT 1
            FROM "urls"
            WHERE "short_code" = generated_code
        );
    END LOOP;

    NEW."short_code" := generated_code;

    RETURN NEW;
END;
$$;