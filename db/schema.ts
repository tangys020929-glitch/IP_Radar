import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const cases = sqliteTable("cases", {
  id: text("id").primaryKey(),
  sourceCaseId: text("source_case_id").notNull().default(""),
  caseName: text("case_name").notNull().default(""),
  partners: text("partners").notNull().default(""),
  ipName: text("ip_name").notNull(),
  ipLicensor: text("ip_licensor").notNull().default(""),
  ipDescription: text("ip_description").notNull().default(""),
  brandName: text("brand_name").notNull(),
  brandIndustry: text("brand_industry").notNull().default(""),
  cooperationDate: text("cooperation_date").notNull().default(""),
  cooperationForm: text("cooperation_form").notNull().default(""),
  cooperationType: text("cooperation_type").notNull().default(""),
  productContent: text("product_content").notNull().default(""),
  cooperationContent: text("cooperation_content").notNull().default(""),
  merchandising: text("merchandising").notNull().default(""),
  activityPlay: text("activity_play").notNull().default(""),
  offlineActivity: text("offline_activity").notNull().default(""),
  highlights: text("highlights").notNull().default(""),
  officialUrl: text("official_url").notNull().default(""),
  tags: text("tags").notNull().default(""),
  ipType: text("ip_type").notNull().default(""),
  ipIntro: text("ip_intro").notNull().default(""),
  brandIntro: text("brand_intro").notNull().default(""),
  brandDescription: text("brand_description").notNull().default(""),
  extraJson: text("extra_json").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const caseImages = sqliteTable("case_images", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  objectKey: text("object_key").notNull(),
  fileName: text("file_name").notNull().default(""),
  contentType: text("content_type").notNull().default("image/jpeg"),
  createdAt: text("created_at").notNull(),
});

export const libraryItems = sqliteTable("library_items", {
  id: text("id").primaryKey(),
  collection: text("collection").notNull(),
  itemName: text("item_name").notNull().default(""),
  payloadJson: text("payload_json").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const schema = { cases, caseImages, libraryItems };
