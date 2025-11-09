import express from "express"
import {
  getOrganizationById,
  searchOrganizations,
  getOrganizationDoctors,
  getOrganizationStaff,
  initializeStaff,
  updateStaff,
  deleteStaff,
} from "../controllers/organizationController.js"

const router = express.Router()

// Search route must come BEFORE /:id route
router.get("/search", searchOrganizations)

// Organization routes
router.get("/:id", getOrganizationById)

// Staff routes - ALL staff routes must come before generic /:id routes
router.get("/:organizationId/staff", getOrganizationStaff)
router.post("/:organizationId/staff", initializeStaff)
router.put("/staff/:staffId", updateStaff)
router.delete("/staff/:staffId", deleteStaff)

// Doctors route
router.get("/:organizationId/doctors", getOrganizationDoctors)

export default router
