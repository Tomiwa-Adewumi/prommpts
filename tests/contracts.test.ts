import { describe, it, expect } from "vitest";
import { validatePromptData } from "../src/lib/validation/prompt-schema";
import { ImageUploadSchema } from "../src/lib/validation/upload-schema";
import { canAccessModel } from "../src/lib/models/tier-validation";
describe("generation input contracts", () => {
  it("rejects empty and oversized generation requests", () => {
    expect(() => validatePromptData("create", {})).toThrow();
    expect(() => validatePromptData("create", {generalIdea:"x".repeat(2001)})).toThrow();
    expect(validatePromptData("create", {generalIdea:"A calm landscape"})).toMatchObject({generalIdea:"A calm landscape"});
  });
  it("requires an image for extraction and both fields for editing", () => {
    expect(() => validatePromptData("extract", {image:""})).toThrow();
    expect(() => validatePromptData("edit", {originalPrompt:"An existing scene"})).toThrow();
  });
  it("retains explicit private visibility and rejects excessive tags", () => {
    expect(ImageUploadSchema.parse({prompt:"A calm landscape",aiModel:"test",isPublic:false}).isPublic).toBe(false);
    expect(() => ImageUploadSchema.parse({prompt:"A calm landscape",aiModel:"test",tags:Array(21).fill("tag")})).toThrow();
  });
  it("denies unknown models and access above the user's tier", () => {
    expect(canAccessModel("free","flux-pro/v1.1-ultra")).toBe(false);
    expect(canAccessModel("pro","nonexistent")).toBe(false);
    expect(canAccessModel("pro","flux-pro/v1.1-ultra")).toBe(true);
  });
});
