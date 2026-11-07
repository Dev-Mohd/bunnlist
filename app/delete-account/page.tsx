import type { Metadata } from "next";
import { DocPage } from "@/components/site/Chrome";
import { CONTACT_EMAIL } from "@/lib/site";

// Google Play asks for a public page that explains how to delete a BunnList account
// and what is deleted, reachable without installing the app.
export const metadata: Metadata = {
  title: "حذف الحساب",
  description: "كيف تحذف حسابك في BunnList وبياناته، من التطبيق أو بطلب عبر البريد.",
};

const subject = encodeURIComponent("طلب حذف حساب BunnList");
const body = encodeURIComponent("أبي أحذف حسابي في BunnList.\nالبريد المسجّل في الحساب: \nاسم المستخدم (إن وجد): ");

export default function DeleteAccountPage() {
  return (
    <DocPage title="حذف حسابك في BunnList" updated="نوفمبر ٢٠٢٦">
      <p>تقدر تحذف حسابك في تطبيق BunnList وكل بياناته في أي وقت. الحذف نهائي ولا يمكن التراجع عنه.</p>

      <h2>من داخل التطبيق</h2>
      <ul>
        <li><b>أندرويد:</b> افتح «ملفي» ← أيقونة الإعدادات ← «حذف الحساب»، ثم أكّد.</li>
        <li><b>آيفون:</b> افتح «ملفي» ← «الإعدادات» ← «حذف الحساب»، ثم أكّد.</li>
      </ul>
      <p>يُحذف الحساب فورًا، ويُحذف معه نفس الحساب على كل أجهزتك.</p>

      <h2>بدون التطبيق</h2>
      <p>
        راسلنا من البريد المسجّل في حسابك على{" "}
        <a className="text-[var(--accent)] underline" href={`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`}>{CONTACT_EMAIL}</a>{" "}
        بعنوان «طلب حذف حساب BunnList»، ونحذفه بعد ما نتأكد أن البريد يخص الحساب، ونرد عليك بالتأكيد.
      </p>

      <h2>وش ينحذف</h2>
      <ul>
        <li>بيانات الحساب: البريد والاسم واسم المستخدم والنبذة والصورة.</li>
        <li>مجموعتك وقوائمك، وتقييماتك، وتجارب التحضير، ووصفاتك، وتعليقاتك وإعجاباتك.</li>
        <li>من تتابعهم ومن يتابعك وطلبات المتابعة والحظر، ونقاطك وتحدياتك.</li>
        <li>رسائلك لنا من «تواصل معنا»، وإعدادات الإشعارات ومعرّفات أجهزتك، وجلسات الدخول.</li>
        <li>وإن كان دخولك عبر Apple، نلغي ربط التطبيق بحسابك في Apple.</li>
      </ul>

      <h2>وش يبقى</h2>
      <p>
        القهوات اللي اقترحتها وانضافت للدليل تبقى في الدليل لأنها صارت جزء منه، لكن بدون اسمك أو أي ربط بحسابك.
      </p>
    </DocPage>
  );
}
