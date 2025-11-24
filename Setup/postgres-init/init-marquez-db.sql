-- Create the database user for Marquez
CREATE USER marquez WITH PASSWORD 'marquez';

-- Create the database for Marquez and set the owner
CREATE DATABASE marquez OWNER marquez;  