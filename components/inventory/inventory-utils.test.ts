import { equipmentLabel, formatInventoryMoney, inventoryStatusTone, isWarrantyDue } from "./inventory-utils"

describe("inventory utilities", () => {
  it("uses manufacturer and model as the equipment label", () => {
    expect(equipmentLabel({ manufacturer: "Dell", model: "Latitude", name: "Laptop" })).toBe("Dell Latitude")
    expect(equipmentLabel({ manufacturer: null, model: null, name: "Laptop" })).toBe("Laptop")
  })

  it("maps operational statuses to visible tones", () => {
    expect(inventoryStatusTone("Available")).toContain("emerald")
    expect(inventoryStatusTone("In Maintenance")).toContain("amber")
    expect(inventoryStatusTone("Retired")).toContain("slate")
  })

  it("formats stock value and identifies warranties due within 30 days", () => {
    expect(formatInventoryMoney(1250)).toContain("1,250")
    expect(isWarrantyDue("2026-02-20", new Date("2026-02-01"))).toBe(true)
    expect(isWarrantyDue("2026-04-01", new Date("2026-02-01"))).toBe(false)
  })
})
