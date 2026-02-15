/** Base fields shared by all resource types */
interface ResourceBase {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  downloadUrl: string;
  createdDate: string;
}

/** An image resource with dimension and thumbnail metadata */
export interface ImageResource extends ResourceBase {
  __typename: "ImageResource";
  width: number | null;
  height: number | null;
  thumbnailUrl: string | null;
}

/** A generic file resource (documents, etc.) */
export interface FileResource extends ResourceBase {
  __typename: "FileResource";
}

/** Discriminated union of all resource types */
export type Resource = ImageResource | FileResource;
