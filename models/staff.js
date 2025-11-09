import mongoose from "mongoose";

const { Schema } = mongoose;

const StaffSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Personal Info
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    middleName: { type: String },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"], default: "other" },

    // Contact
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    phoneNumber: { type: String, required: true, unique: true },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },

    // Employment Info
    staffType: { 
      type: String, 
      required: true, 
      enum: ["doctor", "nurse", "lab_tech", "pharmacist", "admin", "support"],
    },
    role: { type: String, required: true },
    specialization: { type: String },
    licenseNumber: { type: String },
    department: { type: String },
    employmentType: { 
      type: String, 
      enum: ["full-time", "part-time", "contract"], 
      default: "full-time" 
    },
    dateJoined: { type: Date, default: Date.now },

    // Status
    status: { 
      type: String, 
      enum: ["active", "inactive", "suspended", "terminated"], 
      default: "active" 
    },

    // Emergency Contact
    emergencyContactName: { type: String },
    emergencyContactPhone: { type: String },
    emergencyContactRelationship: { type: String },

    // Insurance
    insuranceProvider: { type: String },
    insuranceNumber: { type: String },

    // Audit
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const Staff = mongoose.model("Staff", StaffSchema);
export default Staff;
