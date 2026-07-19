import Link from "next/link";
import { CaptureFrame } from "@/app/components/capture-frame";

export default function ForgotPasswordPage() {
  return (
    <CaptureFrame>
      <div>
        <h1 className="mb-5 text-3xl font-bold sm:text-4xl">Forgot Password</h1>
        <div className="rounded-3xl bg-capture-card px-8 py-9 shadow-[0_18px_40px_rgba(0,0,0,0.25)] sm:px-11">
          <p className="text-lg">
            Password reset is coming soon. For now, contact us and we&apos;ll
            pretend to help.
          </p>
          <div className="mt-8 text-lg font-semibold">
            <Link href="/" className="hover:underline">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </CaptureFrame>
  );
}
