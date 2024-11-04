import express from 'express';
import AWS from 'aws-sdk';
import { parseTerraformState } from './terraformParser';

export default async function createRouter() {
  const router = express.Router();
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
  });

  router.get('/terraform-states', async (req, res) => {
    try {
      const { Contents } = await s3.listObjectsV2({
        Bucket: process.env.S3_BUCKET_NAME,
        Prefix: '',
      }).promise();

      const states = await Promise.all(
        Contents.filter(c => c.Key.endsWith('.tfstate'))
          .map(async (file) => {
            const { Body } = await s3.getObject({ Bucket: process.env.S3_BUCKET_NAME, Key: file.Key }).promise();
            return parseTerraformState(Body.toString());
          })
      );

      res.json(states);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  return router;
}
