CREATE TABLE "conversation_events" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"type" text NOT NULL,
	"actor" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversation_events" ADD CONSTRAINT "conversation_events_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;