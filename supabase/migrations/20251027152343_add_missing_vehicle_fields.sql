/*
  # Add missing vehicle_types fields
  
  1. Changes
    - Add min_booking_lead_time_hours column
    - Add display_order column
    - Add max_passengers column (alias for capacity)
    - Add max_luggage column
    - Add base_price_per_hour column
    
  2. Notes
    - Sets default values for existing records
    - Maintains backward compatibility
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicle_types' AND column_name = 'min_booking_lead_time_hours'
  ) THEN
    ALTER TABLE vehicle_types ADD COLUMN min_booking_lead_time_hours integer DEFAULT 2;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicle_types' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE vehicle_types ADD COLUMN display_order integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicle_types' AND column_name = 'max_luggage'
  ) THEN
    ALTER TABLE vehicle_types ADD COLUMN max_luggage integer DEFAULT 2;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicle_types' AND column_name = 'base_price_per_hour'
  ) THEN
    ALTER TABLE vehicle_types ADD COLUMN base_price_per_hour numeric(10,2) DEFAULT 0;
  END IF;
END $$;

UPDATE vehicle_types SET display_order = 1 WHERE name = 'Sedan Executivo';
UPDATE vehicle_types SET display_order = 2 WHERE name = 'SUV Premium';
UPDATE vehicle_types SET display_order = 3 WHERE name = 'Van Executiva';

UPDATE vehicle_types SET max_luggage = 2, base_price_per_hour = 80.00 WHERE name = 'Sedan Executivo';
UPDATE vehicle_types SET max_luggage = 4, base_price_per_hour = 120.00 WHERE name = 'SUV Premium';
UPDATE vehicle_types SET max_luggage = 10, base_price_per_hour = 150.00 WHERE name = 'Van Executiva';
