-- 产检日期字段归属调整：NT / NIPT / Anatomy Scan 从 Third Trimester 移到 IVF Graduation
-- 与 am-stage-fields-from-xlsx.json 的新顺序保持一致（存量值不能丢）。
--
-- 结构：cases.data = { v: 1, byStage: { "<stage>": { "<key>": "<value>" } } }
-- 注意：cases.data 是 json（不是 jsonb），所以必须先 ::jsonb 再运算，最后 ::json 写回。

UPDATE public.cases AS c
SET data = (
  jsonb_set(
    jsonb_set(
      c.data::jsonb,
      '{byStage,IVF Graduation}',
      COALESCE(c.data::jsonb->'byStage'->'IVF Graduation', '{}'::jsonb)
        || jsonb_strip_nulls(
             jsonb_build_object(
               'nt_date',           c.data::jsonb->'byStage'->'Third Trimester'->'nt_date',
               'nipt_date',         c.data::jsonb->'byStage'->'Third Trimester'->'nipt_date',
               'anatomy_scan_date', c.data::jsonb->'byStage'->'Third Trimester'->'anatomy_scan_date'
             )
           ),
      true
    ),
    '{byStage,Third Trimester}',
    COALESCE(c.data::jsonb->'byStage'->'Third Trimester', '{}'::jsonb)
      - 'nt_date'
      - 'nipt_date'
      - 'anatomy_scan_date',
    true
  )
)::json
WHERE jsonb_exists(c.data::jsonb->'byStage'->'Third Trimester', 'nt_date')
   OR jsonb_exists(c.data::jsonb->'byStage'->'Third Trimester', 'nipt_date')
   OR jsonb_exists(c.data::jsonb->'byStage'->'Third Trimester', 'anatomy_scan_date');
