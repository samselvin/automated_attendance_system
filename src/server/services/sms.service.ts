import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { getSmsProvider, type SmsSendResult } from "@/lib/sms/provider";
import { renderTemplate, buildDedupeKey, DEFAULT_FIRST_HOUR_ABSENCE_TEMPLATE } from "@/lib/sms/template";

const MAX_ATTEMPTS = 3;
const COLLEGE_NAME = "PSN College of Engineering and Technology";

/** Queues (never sends inline — Section 33: must never block attendance
 * submission) a first-hour absence SMS, or records why one wasn't sent
 * (disabled, duplicate, no parent contact). Returns the SmsMessage id to
 * hand to `after()` for actual sending, or null if nothing was queued. */
export async function queueFirstHourAbsenceSms(
  tx: Prisma.TransactionClient,
  studentId: string,
  date: Date
): Promise<string | null> {
  const enabled = await getSetting<boolean>("FIRST_HOUR_ABSENCE_SMS_ENABLED").catch(() => true);
  if (!enabled) return null;

  const dateISO = date.toISOString().slice(0, 10);
  const dedupeKey = buildDedupeKey(studentId, dateISO, "FIRST_HOUR_ABSENCE");

  const existing = await tx.smsMessage.findUnique({ where: { dedupeKey } });
  if (existing) return null;

  const student = await tx.student.findUniqueOrThrow({
    where: { id: studentId },
    include: { parentContacts: { where: { isSmsContact: true }, take: 1 } },
  });
  const templateId = process.env.SMS_TEMPLATE_ID_FIRST_HOUR_ABSENCE || "dev-first-hour-absence";
  const contact = student.parentContacts[0];

  if (!contact) {
    const message = await tx.smsMessage.create({
      data: {
        studentId,
        parentNumber: "",
        templateId,
        finalMessage: "(not sent — no parent SMS contact configured)",
        status: "FAILED",
        providerResponse: "No parent SMS contact configured",
        dedupeKey,
      },
    });
    return message.id;
  }

  const [day, month, year] = [date.getUTCDate(), date.getUTCMonth() + 1, date.getUTCFullYear()];
  const displayDate = `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
  const templateText = await getSetting<string>("SMS_TEMPLATE_FIRST_HOUR_ABSENCE").catch(
    () => DEFAULT_FIRST_HOUR_ABSENCE_TEMPLATE
  );
  const finalMessage = renderTemplate(templateText, {
    student_name: student.fullName,
    roll_number: student.rollNumber,
    date: displayDate,
    college_name: COLLEGE_NAME,
  });

  const message = await tx.smsMessage.create({
    data: { studentId, parentNumber: contact.mobileNumber, templateId, finalMessage, status: "QUEUED", dedupeKey },
  });
  return message.id;
}

/** Actually calls the provider — meant to run via `after()`, off the
 * request path, so a slow or failing gateway never delays a response. */
export async function processQueuedSms(smsMessageId: string): Promise<void> {
  const message = await prisma.smsMessage.findUnique({ where: { id: smsMessageId } });
  if (!message || message.status !== "QUEUED") return;

  const provider = getSmsProvider();
  let attempts = message.attempts;
  let result: SmsSendResult;
  do {
    result = await provider.send({ to: message.parentNumber, message: message.finalMessage, templateId: message.templateId });
    attempts += 1;
  } while (result.status === "FAILED" && attempts < MAX_ATTEMPTS);

  await prisma.smsMessage.update({
    where: { id: smsMessageId },
    data: { status: result.status, providerResponse: result.providerResponse, attempts },
  });
}
