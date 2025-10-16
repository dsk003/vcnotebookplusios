import Foundation

struct FileAttachment: Identifiable, Codable, Hashable {
    let id: String
    let noteId: String
    let userId: String
    let fileName: String
    let fileSize: Int
    let fileType: String
    let storagePath: String
    let storageBucket: String
    let createdAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case noteId = "note_id"
        case userId = "user_id"
        case fileName = "file_name"
        case fileSize = "file_size"
        case fileType = "file_type"
        case storagePath = "storage_path"
        case storageBucket = "storage_bucket"
        case createdAt = "created_at"
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        noteId = try container.decode(String.self, forKey: .noteId)
        userId = try container.decode(String.self, forKey: .userId)
        fileName = try container.decode(String.self, forKey: .fileName)
        fileSize = try container.decode(Int.self, forKey: .fileSize)
        fileType = try container.decode(String.self, forKey: .fileType)
        storagePath = try container.decode(String.self, forKey: .storagePath)
        storageBucket = try container.decode(String.self, forKey: .storageBucket)
        
        let createdAtString = try container.decode(String.self, forKey: .createdAt)
        let formatter = ISO8601DateFormatter()
        createdAt = formatter.date(from: createdAtString) ?? Date()
    }
    
    var formattedFileSize: String {
        let formatter = ByteCountFormatter()
        formatter.countStyle = .file
        return formatter.string(fromByteCount: Int64(fileSize))
    }
    
    var isImage: Bool {
        let imageTypes = ["image/jpeg", "image/png", "image/gif", "image/heic", "image/webp"]
        return imageTypes.contains(fileType.lowercased())
    }
    
    var isVideo: Bool {
        let videoTypes = ["video/mp4", "video/quicktime", "video/mov"]
        return videoTypes.contains(fileType.lowercased())
    }
    
    var fileIcon: String {
        if isImage {
            return "photo"
        } else if isVideo {
            return "video"
        } else if fileType.contains("pdf") {
            return "doc.text"
        } else {
            return "doc"
        }
    }
}

