import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Uploads a file to Firebase Storage
 * @param {File} file - The file to upload
 * @param {string} path - The path in storage (e.g., 'products/image.png')
 * @returns {Promise<string>} - The download URL of the uploaded file
 */
export const uploadFile = async (file, path) => {
  if (!file) return null;
  
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

/**
 * Deletes a file from Firebase Storage
 * @param {string} path - The path in storage to delete
 */
export const deleteFile = async (path) => {
  if (!path) return;
  
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    // If the file doesn't exist, we don't want to break the app
    if (error.code === 'storage/object-not-found') {
      console.warn("File not found in storage, skipping deletion:", path);
      return;
    }
    console.error("Error deleting file:", error);
    throw error;
  }
};

/**
 * Generates a unique path for a file
 * @param {string} userId - User ID to silo files
 * @param {string} folder - Folder name (e.g., 'products')
 * @param {string} originalName - Original filename to get extension
 * @returns {string} - Unique path
 */
export const generateUniquePath = (userId, folder, originalName) => {
  const extension = originalName.split('.').pop();
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  return `users/${userId}/${folder}/${uniqueName}.${extension}`;
};
