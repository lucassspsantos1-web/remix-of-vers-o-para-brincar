ALTER TABLE public.volumosos ADD COLUMN cage_number integer;

-- Ensure valid range
CREATE OR REPLACE FUNCTION public.validate_cage_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cage_number IS NOT NULL AND (NEW.cage_number < 1 OR NEW.cage_number > 24) THEN
    RAISE EXCEPTION 'cage_number must be between 1 and 24';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_volumosos_cage_number
BEFORE INSERT OR UPDATE ON public.volumosos
FOR EACH ROW
EXECUTE FUNCTION public.validate_cage_number();