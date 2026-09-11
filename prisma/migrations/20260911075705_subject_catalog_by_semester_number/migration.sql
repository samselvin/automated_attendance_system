/*
  Warnings:

  - You are about to drop the column `semester_id` on the `subjects` table. All the data in the column will be lost.
  - Added the required column `semester_number` to the `subjects` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "subjects" DROP CONSTRAINT "subjects_semester_id_fkey";

-- AlterTable
ALTER TABLE "subjects" DROP COLUMN "semester_id",
ADD COLUMN     "semester_number" INTEGER NOT NULL;
