-- Only orders are staged. Files from other sources were given a status by the
-- earlier backfill; they have nothing to track, so their status rows go.
DELETE FROM "file_processing" fp
USING "raw_files" rf
WHERE fp."raw_file_id" = rf."id" AND rf."source" <> 'orders';
