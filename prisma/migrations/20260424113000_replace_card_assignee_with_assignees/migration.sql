ALTER TABLE "Card"
ADD COLUMN "assignees" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "Card"
SET "assignees" = CASE
  WHEN "assignee" IS NULL OR BTRIM("assignee") = '' THEN ARRAY[]::TEXT[]
  ELSE ARRAY["assignee"]
END;

ALTER TABLE "Card"
DROP COLUMN "assignee";
