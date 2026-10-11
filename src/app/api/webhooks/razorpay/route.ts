import { NextResponse } from "next/server";
import { handleRazorpayWebhook } from "@/features/checkout/services/payment";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = request.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing x-razorpay-signature header" },
      { status: 400 }
    );
  }

  const rawBody = await request.text();

  const result = await handleRazorpayWebhook({
    rawBody,
    signature,
  });

  if (result.status === "invalid_signature") {
    return NextResponse.json(
      { error: result.message },
      { status: 400 }
    );
  }

  if (result.status === "error") {
    return NextResponse.json(
      { error: result.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    received: true,
    status: result.status,
    message: result.message,
  });
}
