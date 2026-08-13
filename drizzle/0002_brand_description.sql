ALTER TABLE cases ADD COLUMN brand_description TEXT NOT NULL DEFAULT '';
UPDATE cases SET brand_description = brand_intro WHERE brand_description = '' AND brand_intro != '';
