## Getting Started

First, run the development server:

First clone the project

```bash
git clone git@github.com:writeriks/borsaliyorum.git
```

Then navigate:

```bash
cd borsaliyorum
```

And

```bash
npm i
```

## Setup a new postgress db with docker

You should install and setup docker prior to next step. For this go to docker website and download the docker

Once you have docker installed, you can create a new postgress db with:

```bash
docker run -d -e POSTGRES_DB=db_name -e POSTGRES_PASSWORD=db_password -e POSTGRES_USER=db_user_name -p "6500:5432" postgres
```

Once the database is created, you should create a new database url into your `.env` file:

```bash
DATABASE_URL="postgresql://db_user_name:db_password@localhost:6500/db_name"
```

Once database url is created, you may push the prisma file into new db:

```bash
npx prisma db push
```

When database is successfully pushed, it means you should be able to run the prisma studio to open prisma GUI with:

```bash
npx prisma studio
```

## Get the rest of the .env files from team
In order to run the project, get rest of the .env variables from the team.

## Run the project in localhost

Once you have all the .env variables, run the project with:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
