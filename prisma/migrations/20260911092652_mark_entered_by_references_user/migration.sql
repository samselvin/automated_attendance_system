-- DropForeignKey
ALTER TABLE "marks" DROP CONSTRAINT "marks_entered_by_id_fkey";

-- AddForeignKey
ALTER TABLE "marks" ADD CONSTRAINT "marks_entered_by_id_fkey" FOREIGN KEY ("entered_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
