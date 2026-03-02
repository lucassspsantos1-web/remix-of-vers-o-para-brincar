
-- Função atômica para claim de bancada com proteção contra concorrência
-- Usa advisory lock por bench_number para garantir exclusividade
CREATE OR REPLACE FUNCTION public.claim_bench(p_bench_number integer, p_session_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing_session text;
BEGIN
  -- Validação de entrada
  IF p_bench_number < 1 OR p_bench_number > 24 THEN
    RAISE EXCEPTION 'Número de bancada inválido: deve ser entre 1 e 24';
  END IF;

  -- Advisory lock por bench_number para serializar tentativas concorrentes
  PERFORM pg_advisory_xact_lock(p_bench_number::bigint + 1000000);

  -- Limpa bancadas inativas primeiro (dentro do lock)
  DELETE FROM active_benches
  WHERE last_seen < now() - interval '60 seconds';

  -- Verifica se já está ocupada por outra sessão
  SELECT session_id INTO v_existing_session
  FROM active_benches
  WHERE bench_number = p_bench_number;

  IF v_existing_session IS NOT NULL AND v_existing_session <> p_session_id THEN
    -- Bancada ocupada por outra sessão
    RETURN false;
  END IF;

  IF v_existing_session = p_session_id THEN
    -- Já pertence a esta sessão (reconexão), apenas atualiza last_seen
    UPDATE active_benches
    SET last_seen = now()
    WHERE bench_number = p_bench_number AND session_id = p_session_id;
    RETURN true;
  END IF;

  -- Bancada livre: inserir
  INSERT INTO active_benches (bench_number, session_id, last_seen)
  VALUES (p_bench_number, p_session_id, now());

  RETURN true;
END;
$$;
