import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@clerk/nextjs/server", () => ({auth:vi.fn(async () => ({userId:null}))}));
vi.mock("@/lib/database/supabase", () => ({supabaseAdmin:{from:vi.fn()}}));
import { POST, DELETE } from "../src/app/api/stripe/checkout/route";
import { supabaseAdmin } from "../src/lib/database/supabase";
afterEach(() => vi.unstubAllEnvs());
it("rejects signed-out checkout before accessing Stripe or the database", async () => {
  vi.stubEnv("STRIPE_SECRET_KEY", "");
  const response = await POST(new NextRequest("http://localhost/api/stripe/checkout",{method:"POST",body:JSON.stringify({packageId:"fixture"})}));
  expect(response.status).toBe(401);
  expect(supabaseAdmin.from).not.toHaveBeenCalled();
});

it("rejects signed-out cancellation before accessing Stripe", async () => {
  vi.stubEnv("STRIPE_SECRET_KEY", "");
  const response = await DELETE(new NextRequest("http://localhost/api/stripe/checkout", {method:"DELETE"}));
  expect(response.status).toBe(401);
});
