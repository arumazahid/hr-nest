-- HR Nest schema 12: every company brings its own AI key (Gemini, OpenAI or Anthropic).
-- The key itself is encrypted in company_secrets, which the browser can never read.
alter table company_secrets add column ai_key_enc text;
alter table companies add column ai_provider text check (ai_provider in ('gemini', 'openai', 'anthropic'));
alter table companies add column ai_model text;
