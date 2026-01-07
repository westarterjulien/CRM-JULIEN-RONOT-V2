import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { prisma } from "@/lib/prisma"

const DEFAULT_TENANT_ID = BigInt(1)

interface S3Config {
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  forcePathStyle?: boolean
}

// Get S3 config from tenant settings
export async function getS3Config(): Promise<S3Config | null> {
  const tenant = await prisma.tenants.findUnique({
    where: { id: DEFAULT_TENANT_ID },
    select: { settings: true },
  })

  if (!tenant?.settings) return null

  const settings = typeof tenant.settings === "string"
    ? JSON.parse(tenant.settings)
    : tenant.settings

  if (!settings.s3Endpoint || !settings.s3AccessKey || !settings.s3SecretKey || !settings.s3Bucket) {
    return null
  }

  return {
    endpoint: settings.s3Endpoint,
    region: settings.s3Region || "auto",
    accessKeyId: settings.s3AccessKey,
    secretAccessKey: settings.s3SecretKey,
    bucket: settings.s3Bucket,
    forcePathStyle: settings.s3ForcePathStyle ?? true, // MinIO requires path-style
  }
}

// Create S3 client from config
export function createS3Client(config: S3Config): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: config.forcePathStyle,
  })
}

// Upload file to S3
export async function uploadToS3(
  file: Buffer,
  key: string,
  contentType: string,
  config: S3Config
): Promise<{ success: boolean; error?: string }> {
  const client = createS3Client(config)

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
      })
    )
    return { success: true }
  } catch (error) {
    console.error("S3 upload error:", error)
    return { success: false, error: (error as Error).message }
  }
}

// Get presigned download URL
export async function getPresignedDownloadUrl(
  key: string,
  config: S3Config,
  expiresIn: number = 3600 // 1 hour
): Promise<string> {
  const client = createS3Client(config)

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  })

  return getSignedUrl(client, command, { expiresIn })
}

// Get presigned upload URL for direct browser upload
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  config: S3Config,
  expiresIn: number = 3600 // 1 hour
): Promise<string> {
  const client = createS3Client(config)

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
  })

  return getSignedUrl(client, command, { expiresIn })
}

// Delete file from S3
export async function deleteFromS3(
  key: string,
  config: S3Config
): Promise<{ success: boolean; error?: string }> {
  const client = createS3Client(config)

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: key,
      })
    )
    return { success: true }
  } catch (error) {
    console.error("S3 delete error:", error)
    return { success: false, error: (error as Error).message }
  }
}
