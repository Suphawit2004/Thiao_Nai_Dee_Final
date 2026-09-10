import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ server: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ getSupabaseServer: mocks.server }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { listMyPhotos, uploadPhoto } from "./photos";

describe("community photo authentication and profile ownership", () => {
  beforeEach(() => vi.clearAllMocks());
  it("rejects guest uploads before touching storage", async () => {
    const storage = { from: vi.fn() };
    mocks.server.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) }, storage });
    expect(await uploadPhoto(new FormData())).toMatchObject({ ok: false });
    expect(storage.from).not.toHaveBeenCalled();
  });
  it("returns no profile photos to a guest", async () => {
    const eq = vi.fn();
    mocks.server.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) }, from: () => ({ select: () => ({ eq }) }) });
    expect(await listMyPhotos()).toEqual({ photos: [], error: "กรุณาเข้าสู่ระบบ" });
    expect(eq).not.toHaveBeenCalled();
  });
  it("filters by the authenticated ID even for an admin account", async () => {
    const query = { eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [], error: null }) };
    mocks.server.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "admin-id" } } }) }, from: () => ({ select: () => query }) });
    expect(await listMyPhotos()).toEqual({ photos: [] });
    expect(query.eq).toHaveBeenCalledWith("user_id", "admin-id");
  });
});
