CREATE TABLE "contributions" (
	"id" serial PRIMARY KEY NOT NULL,
	"politician_id" integer,
	"organization" text NOT NULL,
	"amount" numeric NOT NULL,
	"contribution_date" date NOT NULL,
	"industry" text
);
--> statement-breakpoint
CREATE TABLE "pipeline_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"pipeline_name" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"status" text NOT NULL,
	"rows_processed" integer DEFAULT 0,
	"rows_inserted" integer DEFAULT 0,
	"notes" text,
	"log_url" text
);
--> statement-breakpoint
CREATE TABLE "politician_aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"politician_id" integer NOT NULL,
	"source" text NOT NULL,
	"external_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "politicians" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"state" text NOT NULL,
	"party" text NOT NULL,
	"profile_image" text,
	"photo_url" text,
	"fec_candidate_id" text,
	"bioguide_id" text
);
--> statement-breakpoint
CREATE TABLE "stock_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"politician_id" integer,
	"stock_name" text NOT NULL,
	"trade_date" date NOT NULL,
	"trade_type" text NOT NULL,
	"amount" numeric NOT NULL,
	"related_bill" text,
	"potential_conflict" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"politician_id" integer,
	"bill_name" text NOT NULL,
	"bill_description" text,
	"vote_date" date NOT NULL,
	"vote_result" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_politician_id_politicians_id_fk" FOREIGN KEY ("politician_id") REFERENCES "public"."politicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "politician_aliases" ADD CONSTRAINT "politician_aliases_politician_id_politicians_id_fk" FOREIGN KEY ("politician_id") REFERENCES "public"."politicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_politician_id_politicians_id_fk" FOREIGN KEY ("politician_id") REFERENCES "public"."politicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_politician_id_politicians_id_fk" FOREIGN KEY ("politician_id") REFERENCES "public"."politicians"("id") ON DELETE no action ON UPDATE no action;