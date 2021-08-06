const mongoose = require("mongoose");

const spaceSchema = mongoose.Schema({
    name: {
        type: "string",
        required: true
    },
    password: {
        type: "string",
        required: true
    },
    description: {
        type: "string",
        default: ""
    },
    announcements: [{
        announcement: {
            type: String
        }
    }],
    files: [{
        displayName: {
            type: String,
            required: true
        },
        fileName: {
            type: String,
            required: true
        },
        path: {
            type: String,
            required: true
        },
        size: {
            type: String,
            required: true
        },
        fileType: {
            type: String,
            required: true
        },
    }],
    users: [{
        email: {
            type: String,
        },
        admin: {
            type: Boolean
        }
    }]
})

const Space = new mongoose.model("Space", spaceSchema);

module.exports = Space;