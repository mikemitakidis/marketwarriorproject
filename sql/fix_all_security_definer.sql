-- ============================================================================
-- AUTOMATIC FIX: Update ALL functions with SECURITY DEFINER
-- This script finds and fixes ALL functions, not just specific ones
-- ============================================================================

DO $$
DECLARE
    func_record RECORD;
    func_signature TEXT;
BEGIN
    -- Loop through all functions in public schema that have SECURITY DEFINER
    FOR func_record IN
        SELECT
            p.proname as function_name,
            pg_get_function_arguments(p.oid) as arguments,
            pg_get_functiondef(p.oid) as function_definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.prosecdef = true  -- Has SECURITY DEFINER
          AND (p.proconfig IS NULL OR NOT ('search_path=' || '' = ANY(p.proconfig)))  -- search_path is not empty
    LOOP
        -- Extract and modify the function definition
        RAISE NOTICE 'Fixing function: %', func_record.function_name;

        -- Replace 'SET search_path = public' or 'SET search_path = <anything>' with 'SET search_path = '''''
        func_signature := regexp_replace(
            func_record.function_definition,
            'SET search_path[[:space:]]*=[[:space:]]*[^;]*',
            'SET search_path = ''''',
            'g'
        );

        -- If no SET search_path exists, add it before AS $$
        IF func_signature !~ 'SET search_path' THEN
            func_signature := regexp_replace(
                func_signature,
                '(SECURITY DEFINER)',
                '\1\nSET search_path = ''''',
                'g'
            );
        END IF;

        -- Execute the modified function definition
        EXECUTE func_signature;
    END LOOP;

    RAISE NOTICE 'All SECURITY DEFINER functions have been updated';
END $$;

-- ============================================================================
-- Verify the changes
-- ============================================================================
SELECT
    proname as function_name,
    CASE
        WHEN prosecdef THEN 'YES'
        ELSE 'NO'
    END as has_security_definer,
    CASE
        WHEN proconfig IS NOT NULL AND ('search_path=' || '' = ANY(proconfig)) THEN 'EMPTY (SECURE)'
        WHEN proconfig IS NOT NULL THEN array_to_string(proconfig, ', ')
        ELSE 'NOT SET'
    END as search_path_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = true
ORDER BY proname;
