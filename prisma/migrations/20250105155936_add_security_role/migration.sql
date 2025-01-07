-- AlterTable
ALTER TABLE "CommentLikes" ADD COLUMN     "commentLikeId" SERIAL NOT NULL,
ADD CONSTRAINT "CommentLikes_pkey" PRIMARY KEY ("commentLikeId");

-- AlterTable
ALTER TABLE "PostLikes" ADD COLUMN     "postLikeId" SERIAL NOT NULL,
ADD CONSTRAINT "PostLikes_pkey" PRIMARY KEY ("postLikeId");

-- AlterTable
ALTER TABLE "Repost" ADD COLUMN     "repostId" SERIAL NOT NULL,
ADD CONSTRAINT "Repost_pkey" PRIMARY KEY ("repostId");

-- AlterTable
ALTER TABLE "StockFollowers" ADD COLUMN     "stockFollowerId" SERIAL NOT NULL,
ADD CONSTRAINT "StockFollowers_pkey" PRIMARY KEY ("stockFollowerId");
