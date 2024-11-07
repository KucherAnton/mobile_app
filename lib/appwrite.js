import {
	Account,
	Avatars,
	Client,
	Databases,
	ID,
	Query,
	Storage,
} from 'react-native-appwrite';

export const config = {
	endpoint: 'https://cloud.appwrite.io/v1',
	platform: 'com.jsm.aora',
	projectId: '6729ec9500134945194c',
	databaseId: '6729ede40029084f8bfb',
	userCollectionId: '6729ee0c003ad5c7f523',
	videoCollectionId: '6729ee3a001ab5935eb0',
	storageId: '6729ef910007bf1aca90',
};

const client = new Client();

client
	.setEndpoint(config.endpoint)
	.setProject(config.projectId)
	.setPlatform(config.platform);

const account = new Account(client);
const avatars = new Avatars(client);
const databases = new Databases(client);
const storage = new Storage(client);

export const createUser = async (email, password, username) => {
	try {
		const newAccount = await account.create(
			ID.unique(),
			email,
			password,
			username
		);

		if (!newAccount) throw Error;

		const avatarUrl = avatars.getInitials(username);

		await signIn(email, password);

		const newUser = await databases.createDocument(
			config.databaseId,
			config.userCollectionId,
			ID.unique(),
			{ accountId: newAccount.$id, email, username, avatar: avatarUrl }
		);

		return newUser;
	} catch (e) {
		throw new Error(e);
	}
};

export const signIn = async (email, password) => {
	try {
		const session = await account.createEmailPasswordSession(email, password);

		return session;
	} catch (e) {
		throw new Error(e);
	}
};

export const getCurrentUser = async () => {
	try {
		const currentAccount = await account.get();

		if (!currentAccount) throw Error;

		const currentUser = await databases.listDocuments(
			config.databaseId,
			config.userCollectionId,
			[Query.equal('accountId', currentAccount.$id)]
		);

		if (!currentUser) throw Error;

		return currentUser.documents[0];
	} catch (e) {
		throw new Error(e);
	}
};

export const getAllPosts = async () => {
	try {
		const posts = await databases.listDocuments(
			config.databaseId,
			config.videoCollectionId
		);
		return posts.documents;
	} catch (e) {
		throw new Error(e);
	}
};

export const getLatestPosts = async () => {
	try {
		const posts = await databases.listDocuments(
			config.databaseId,
			config.videoCollectionId,
			[Query.orderDesc('$createdAt', Query.limit(7))]
		);
		return posts.documents;
	} catch (e) {
		throw new Error(e);
	}
};

export const searchPosts = async (query) => {
	try {
		const posts = await databases.listDocuments(
			config.databaseId,
			config.videoCollectionId,
			[Query.search('title', query)]
		);
		return posts.documents;
	} catch (e) {
		throw new Error(e);
	}
};

export const getUserPosts = async (userId) => {
	try {
		const posts = await databases.listDocuments(
			config.databaseId,
			config.videoCollectionId,
			[Query.equal('creator', userId)]
		);
		return posts.documents;
	} catch (e) {
		throw new Error(e);
	}
};

export const signOut = async () => {
	try {
		const session = await account.deleteSession('current');
		return session;
	} catch (e) {
		throw new Error(e);
	}
};

export const getFilePreview = async (fileId, type) => {
	let fileUrl;
	try {
		if (type === 'video') {
			fileUrl = storage.getFileView(storageId, fileId);
		} else if (type === 'image') {
			fileUrl = storage.getFilePreview(
				storageId,
				fileId,
				2000,
				2000,
				'top',
				100
			);
		} else {
			throw new Error('Invalid file type');
		}

		if (!fileUrl) throw Error;

		return fileUrl;
	} catch (e) {
		throw new Error(e);
	}
};

export const uploadFile = async (file, type) => {
	if (!file) return;

	const { mimeType, ...rest } = file;
	const asset = { type: mimeType, ...rest };

	try {
		const uploadedFile = await storage.createFile(
			storageId,
			ID.unique(),
			asset
		);

		const fileUrl = await getFilePreview(uploadedFile.$id, type);

		return fileUrl;
	} catch (e) {
		throw new Error(e);
	}
};

export const createVideo = async (form) => {
	try {
		const { thumbnailUrl, videoUrl } = await Promise.all([
			uploadFile(form.thumbnail, 'image'),
			uploadFile(form.video, 'video'),
		]);

		const newPost = await databases.createDocument(
			databaseId,
			videoCollectionId,
			ID.unique(),
			{
				title: form.title,
				thumbnail: thumbnailUrl,
				video: videoUrl,
				prompt: form.prompt,
				creator: form.userId,
			}
		);

		return newPost;
	} catch (e) {
		throw new Error(e);
	}
};
