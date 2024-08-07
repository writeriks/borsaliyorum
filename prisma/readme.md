Instructions to create docker Postgresql image

terminal:
docker run -d -e POSTGRES_DB=db_name -e POSTGRES_PASSWORD=db_password -e POSTGRES_USER=db_user_name -p "6500:5432" postgres

.env:
DATABASE_URL="postgresql://db_user_name:db_password@localhost:6500/db_name"
