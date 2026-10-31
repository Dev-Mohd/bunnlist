-- «مزيج» as a process: blends of coffees processed different ways (e.g. a natural
-- and a washed together). Additive: a new enum value, nothing else changes.
ALTER TYPE "CoffeeProcess" ADD VALUE IF NOT EXISTS 'MIXED' BEFORE 'OTHER';
