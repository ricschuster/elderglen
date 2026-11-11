"""Batch 1 interior plans (note 86): sawmill, healer, smithy.

Coordinates are plan tiles with no walls (gen.py adds them). Each building has its
own shape: a public room at the front with the 2 wide door notch, the household
behind it off a living area, bedrooms behind gates.
"""
from gen import Plan


def sawmill():
    p = Plan("sawmill", "sawmill and carpenter, Stardew sized")
    # shop at the front, workshop stepping out to the south-east, home behind
    p.floor(3, 14, 14, 21)            # shop
    p.floor(16, 13, 28, 22)           # workshop
    p.floor(15, 17, 15, 18)           # opening shop to workshop
    p.floor(9, 12, 10, 13)            # passage north
    p.floor(7, 7, 16, 11)             # living area
    p.floor(0, 5, 5, 11)              # parents' bedroom
    p.floor(9, 1, 14, 5)              # Wren's room
    p.floor(18, 5, 24, 11)            # kitchen
    p.floor(17, 9, 17, 10)            # kitchen opening
    p.floor(26, 6, 28, 10)            # pantry
    p.floor(25, 8, 25, 9)             # pantry opening
    p.floor(6, 22, 7, 23)             # door notch
    p.door(6, 24, 23)
    # shop
    p.put("S", 3, 14, 8, 14)          # plank and blueprint shelves
    p.put("C", 5, 16, 9, 16)          # counter, 5 wide
    p.put("r", 4, 18, 8, 19)
    p.put("S", 9, 19, 12, 20)         # timber sample island
    p.put("L", 12, 17, 13, 17)        # model display
    p.put("X", 3, 18, 3, 20)
    p.put("X", 13, 20, 14, 21)
    # workshop
    p.put("S", 16, 13, 27, 13)        # log racks on the back wall
    p.put("W", 19, 15, 22, 16)        # saw bench
    p.put("W", 25, 19, 26, 20)        # planer
    p.put("X", 27, 15, 28, 18)        # log stack by the mill wheel
    p.put("T", 18, 20, 20, 21)        # work table
    p.put("r", 21, 18, 23, 19)
    # living area
    p.put("H", 14, 7, 16, 7)
    p.put("Q", 8, 9, 11, 9)
    p.put("r", 10, 10, 13, 11)
    # parents' room
    p.gate("parents", 6, 8, 6, 9)
    p.put("B", 1, 5, 2, 6)
    p.put("S", 4, 5, 5, 5)
    p.put("r", 2, 9, 4, 10)
    # Wren's room
    p.gate("child", 11, 6, 12, 6)
    p.put("B", 9, 1, 10, 2)
    p.put("T", 13, 1, 14, 1)
    p.put("X", 13, 4, 14, 5)
    # kitchen and pantry
    p.put("K", 18, 5, 24, 5)
    p.put("T", 20, 8, 22, 9)
    p.put("S", 26, 6, 28, 6)
    p.put("S", 28, 7, 28, 9)
    p.put("X", 26, 10)
    # marks
    p.mark("service-sawmill-1", 6, 17)
    p.mark("service-sawmill-2", 7, 17)
    p.mark("spot-counter-serve", 6, 15)
    p.mark("spot-counter-stock", 10, 15)
    p.mark("spot-workshop-saw", 20, 17)
    p.mark("spot-home-sit", 9, 10)
    p.mark("spot-home-cook", 21, 6)
    p.mark("bed-parents", 3, 7)
    p.mark("bed-child", 11, 3)
    return p


def healer():
    p = Plan("healer", "healer's clinic and flat, Stardew sized")
    p.floor(2, 12, 11, 17)            # waiting room and counter
    p.floor(12, 14, 12, 15)           # opening to the ward
    p.floor(13, 10, 21, 17)           # ward
    p.floor(9, 11, 10, 11)            # passage north
    p.floor(3, 6, 11, 10)             # living area
    p.floor(2, 1, 8, 4)               # kitchen
    p.floor(5, 5, 6, 5)               # kitchen opening
    p.floor(10, 1, 12, 4)             # herb pantry
    p.floor(9, 2, 9, 3)               # pantry opening
    p.floor(13, 3, 19, 7)             # healer's bedroom
    p.floor(6, 18, 7, 19)             # door notch
    p.door(6, 20, 19)
    # waiting room
    p.put("S", 3, 12, 8, 12)          # medicine shelves
    p.put("C", 4, 14, 7, 14)          # counter, 4 wide
    p.put("Q", 3, 17, 4, 17)
    p.put("Q", 9, 17, 10, 17)
    p.put("L", 10, 14, 10, 15)        # tank of pale tonics
    p.put("r", 5, 16, 8, 16)
    # ward
    p.put("S", 13, 10, 21, 10)        # linen and supplies
    p.put("B", 14, 11, 15, 12)
    p.put("B", 19, 11, 20, 12)
    p.put("S", 17, 11, 17, 12)        # screen
    p.put("B", 14, 16, 15, 17)
    p.put("B", 19, 16, 20, 17)
    p.put("S", 17, 16, 17, 17)        # screen
    p.put("r", 16, 14, 18, 15)
    # flat
    p.put("H", 6, 6, 8, 6)
    p.put("Q", 4, 8, 7, 8)
    p.put("r", 5, 9, 8, 10)
    p.put("K", 2, 1, 8, 1)
    p.put("T", 2, 3, 3, 4)
    p.put("S", 10, 1, 12, 1)
    p.put("S", 12, 2, 12, 4)
    p.gate("healer", 12, 6, 12, 7)
    p.put("B", 14, 3, 15, 4)
    p.put("S", 18, 3, 19, 3)
    p.put("r", 16, 5, 18, 6)
    # marks
    p.mark("service-healer-1", 5, 15)
    p.mark("service-healer-2", 6, 15)
    p.mark("spot-counter-serve", 5, 13)
    p.mark("spot-counter-stock", 8, 13)
    p.mark("spot-ward-round", 16, 13)
    p.mark("spot-home-sit", 9, 9)
    p.mark("spot-home-cook", 5, 2)
    p.mark("bed-healer", 16, 5)
    p.mark("bed-patient-1", 14, 13)
    p.mark("bed-patient-2", 19, 13)
    return p


def smithy():
    p = Plan("smithy", "smithy and mender, tall plan")
    p.floor(2, 14, 11, 20)            # shop room
    p.floor(12, 12, 17, 18)           # forge wing stepping east
    p.floor(5, 12, 6, 13)             # passage north
    p.floor(2, 6, 9, 11)              # living area
    p.floor(10, 7, 10, 8)             # gate cells
    p.floor(11, 2, 17, 9)             # bedroom
    p.floor(3, 1, 8, 4)               # kitchen
    p.floor(5, 5, 6, 5)               # kitchen opening
    p.floor(-1, 1, 1, 4)              # pantry
    p.floor(2, 2, 2, 3)               # pantry opening
    p.floor(5, 21, 6, 22)             # door notch
    p.door(5, 23, 22)
    # shop room
    p.put("S", 2, 14, 4, 14)          # tool and ore shelves
    p.put("S", 7, 14, 8, 14)
    p.put("C", 3, 16, 7, 16)          # counter, 5 wide
    p.put("r", 3, 18, 7, 19)
    p.put("X", 9, 15, 11, 15)         # ore bins
    p.put("X", 2, 18, 2, 20)
    p.put("L", 10, 18, 11, 19)        # display of tools
    # forge wing: open to the shop along the shared edge
    p.floor(12, 14, 12, 15)
    p.put("H", 14, 12, 16, 12)        # furnace on the back wall
    p.put("W", 14, 15, 15, 15)        # anvil
    p.put("X", 17, 14, 17, 17)        # coal
    p.put("W", 13, 17, 14, 17)        # grindstone
    p.put("r", 15, 17, 16, 18)
    # living area
    p.put("H", 7, 6, 9, 6)
    p.put("Q", 3, 8, 5, 8)
    p.put("r", 4, 9, 7, 10)
    # bedroom
    p.gate("smith", 10, 7, 10, 8)
    p.put("B", 12, 2, 13, 3)
    p.put("S", 16, 2, 17, 2)
    p.put("r", 13, 6, 16, 8)
    # kitchen and pantry
    p.put("K", 3, 1, 8, 1)
    p.put("T", 4, 3, 6, 3)
    p.put("S", -1, 1, 1, 1)
    p.put("X", -1, 4, 0, 4)
    # marks
    p.mark("service-smithy-1", 4, 17)
    p.mark("service-smithy-2", 5, 17)
    p.mark("spot-counter-serve", 4, 15)
    p.mark("spot-counter-stock", 9, 16)
    p.mark("spot-forge", 15, 16)
    p.mark("spot-home-sit", 6, 9)
    p.mark("spot-home-cook", 5, 2)
    p.mark("bed-smith", 14, 5)
    return p


ALL = [sawmill(), healer(), smithy()]
