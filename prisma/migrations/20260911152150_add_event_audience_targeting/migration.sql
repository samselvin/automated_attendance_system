-- AlterTable
ALTER TABLE "events" ADD COLUMN     "class_id" TEXT,
ADD COLUMN     "student_group_id" TEXT,
ADD COLUMN     "year_of_study" INTEGER;

-- CreateIndex
CREATE INDEX "events_audience_type_is_published_start_at_idx" ON "events"("audience_type", "is_published", "start_at");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_student_group_id_fkey" FOREIGN KEY ("student_group_id") REFERENCES "student_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
