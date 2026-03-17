-- Add dedicated movement type for product creation opening balances
ALTER TYPE "MovementType" ADD VALUE IF NOT EXISTS 'OPENING_STOCK';
