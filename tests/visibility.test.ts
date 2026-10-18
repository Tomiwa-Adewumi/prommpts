import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({from:vi.fn(),update:vi.fn(),single:vi.fn()}));
vi.mock("@/lib/supabase-auth", () => ({getAuthenticatedSupabaseClient:vi.fn(async () => ({user:{id:"clerk-alice"},supabase:{from:mocks.from}}))}));
vi.mock("@/lib/database/users", () => ({usersApi:{getUserUuidFromClerkId:vi.fn(async () => "alice")}}));
import { PATCH } from "../src/app/api/images/[id]/visibility/route";
beforeEach(() => {vi.clearAllMocks();mocks.from.mockReturnValue({select:()=>({eq:()=>({single:mocks.single})}),update:mocks.update});});
it("rejects visibility changes for another user's image", async () => {
  mocks.single.mockResolvedValue({data:{user_id:"bob"},error:null});
  const response = await PATCH(new NextRequest("http://localhost/api/images/example/visibility",{method:"PATCH",body:JSON.stringify({isPublic:true})}),{params:Promise.resolve({id:"example"})});
  expect(response.status).toBe(403);
  expect(mocks.update).not.toHaveBeenCalled();
});
