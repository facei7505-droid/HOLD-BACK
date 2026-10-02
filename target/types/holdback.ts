/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/holdback.json`.
 */
export type Holdback = {
  "address": "6t4LfjbFTBDVhmNypAsHYSvaKdpBNmWLpDaF3G8nZrvB",
  "metadata": {
    "name": "holdback",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Construction retention money locked in a program vault and released automatically"
  },
  "instructions": [
    {
      "name": "acceptContract",
      "docs": [
        "The subcontractor accepts the terms, including the arbiter. Only now",
        "can payments start."
      ],
      "discriminator": [
        217,
        254,
        164,
        16,
        244,
        59,
        30,
        81
      ],
      "accounts": [
        {
          "name": "subcontractor",
          "signer": true,
          "relations": [
            "contract"
          ]
        },
        {
          "name": "contract",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "buyClaim",
      "docs": [
        "A funder buys the claim: pays the holder and becomes the beneficiary",
        "in the same transaction, so neither side can be cheated. `min_unfrozen`",
        "protects the buyer against the vault shrinking before the sale lands."
      ],
      "discriminator": [
        168,
        110,
        230,
        142,
        141,
        246,
        67,
        232
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "contract",
          "writable": true
        },
        {
          "name": "mint",
          "relations": [
            "contract"
          ]
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "contract"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "buyerToken",
          "writable": true
        },
        {
          "name": "sellerToken",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "maxPrice",
          "type": "u64"
        },
        {
          "name": "minUnfrozen",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createContract",
      "docs": [
        "Client proposes a contract to a subcontractor and names an arbiter.",
        "The contract stays `Proposed` until the subcontractor accepts it, so a",
        "client cannot unilaterally pick a friendly arbiter.",
        "`arbiter_window_secs`: how long after the warranty ends the arbiter may",
        "still settle an open defect before anyone can release the vault."
      ],
      "discriminator": [
        244,
        48,
        244,
        178,
        216,
        88,
        122,
        52
      ],
      "accounts": [
        {
          "name": "client",
          "writable": true,
          "signer": true
        },
        {
          "name": "subcontractor"
        },
        {
          "name": "arbiter"
        },
        {
          "name": "mint"
        },
        {
          "name": "contract",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "client"
              },
              {
                "kind": "arg",
                "path": "contractId"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "contract"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "contractId",
          "type": "u64"
        },
        {
          "name": "retentionBps",
          "type": "u16"
        },
        {
          "name": "warrantySecs",
          "type": "i64"
        },
        {
          "name": "arbiterWindowSecs",
          "type": "i64"
        },
        {
          "name": "title",
          "type": "string"
        }
      ]
    },
    {
      "name": "listClaim",
      "docs": [
        "The current claim holder offers the locked retention for sale.",
        "price = 0 removes the offer."
      ],
      "discriminator": [
        170,
        28,
        51,
        91,
        64,
        103,
        21,
        4
      ],
      "accounts": [
        {
          "name": "beneficiary",
          "signer": true,
          "relations": [
            "contract"
          ]
        },
        {
          "name": "contract",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "price",
          "type": "u64"
        }
      ]
    },
    {
      "name": "payProgress",
      "docs": [
        "Client pays an invoice. One transaction, two transfers:",
        "the subcontractor's share and the retention into the vault."
      ],
      "discriminator": [
        172,
        18,
        92,
        4,
        154,
        242,
        59,
        175
      ],
      "accounts": [
        {
          "name": "client",
          "writable": true,
          "signer": true,
          "relations": [
            "contract"
          ]
        },
        {
          "name": "contract",
          "writable": true
        },
        {
          "name": "mint",
          "relations": [
            "contract"
          ]
        },
        {
          "name": "clientToken",
          "writable": true
        },
        {
          "name": "subcontractorToken",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "contract"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "raiseDefect",
      "docs": [
        "Client reports a defect before the warranty ends. Only the cost of the",
        "defect is frozen, the rest of the retention stays on its way out."
      ],
      "discriminator": [
        254,
        189,
        86,
        22,
        254,
        108,
        64,
        178
      ],
      "accounts": [
        {
          "name": "client",
          "signer": true,
          "relations": [
            "contract"
          ]
        },
        {
          "name": "contract",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "evidenceHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "release",
      "docs": [
        "After the warranty date anyone can release the retention to the",
        "current beneficiary. No calls, no reminders, no permission needed."
      ],
      "discriminator": [
        253,
        249,
        15,
        206,
        28,
        127,
        193,
        241
      ],
      "accounts": [
        {
          "name": "caller",
          "docs": [
            "Anyone: the subcontractor, a bot, a stranger in the audience."
          ],
          "signer": true
        },
        {
          "name": "contract",
          "writable": true
        },
        {
          "name": "mint",
          "relations": [
            "contract"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "contract"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "beneficiaryToken",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "resolveDefect",
      "docs": [
        "Arbiter settles an open defect: either the frozen amount pays for the",
        "repair (goes to the client) or it is unfrozen for the subcontractor."
      ],
      "discriminator": [
        183,
        52,
        108,
        28,
        204,
        142,
        201,
        58
      ],
      "accounts": [
        {
          "name": "arbiter",
          "signer": true,
          "relations": [
            "contract"
          ]
        },
        {
          "name": "contract",
          "writable": true
        },
        {
          "name": "mint",
          "relations": [
            "contract"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "contract"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "clientToken",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "payClient",
          "type": "bool"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "contract",
      "discriminator": [
        172,
        138,
        115,
        242,
        121,
        67,
        183,
        26
      ]
    }
  ],
  "events": [
    {
      "name": "claimListed",
      "discriminator": [
        149,
        25,
        205,
        144,
        73,
        136,
        112,
        102
      ]
    },
    {
      "name": "claimSold",
      "discriminator": [
        204,
        81,
        156,
        170,
        171,
        111,
        145,
        20
      ]
    },
    {
      "name": "contractAccepted",
      "discriminator": [
        44,
        209,
        126,
        23,
        190,
        99,
        31,
        196
      ]
    },
    {
      "name": "contractCreated",
      "discriminator": [
        80,
        69,
        164,
        109,
        77,
        15,
        47,
        164
      ]
    },
    {
      "name": "defectRaised",
      "discriminator": [
        177,
        176,
        145,
        88,
        69,
        66,
        107,
        110
      ]
    },
    {
      "name": "defectResolved",
      "discriminator": [
        77,
        0,
        220,
        230,
        46,
        101,
        206,
        28
      ]
    },
    {
      "name": "progressPaid",
      "discriminator": [
        162,
        35,
        182,
        191,
        121,
        38,
        179,
        79
      ]
    },
    {
      "name": "released",
      "discriminator": [
        232,
        229,
        255,
        136,
        101,
        189,
        15,
        220
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "badRetention",
      "msg": "Retention must be between 0.01% and 20%"
    },
    {
      "code": 6001,
      "name": "badWarranty",
      "msg": "Warranty period must be positive"
    },
    {
      "code": 6002,
      "name": "titleTooLong",
      "msg": "Title is too long"
    },
    {
      "code": 6003,
      "name": "zeroAmount",
      "msg": "Amount must be greater than zero"
    },
    {
      "code": 6004,
      "name": "overflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6005,
      "name": "notActive",
      "msg": "Contract is not active"
    },
    {
      "code": 6006,
      "name": "warrantyOver",
      "msg": "Warranty period is already over"
    },
    {
      "code": 6007,
      "name": "warrantyNotOver",
      "msg": "Warranty period is not over yet"
    },
    {
      "code": 6008,
      "name": "defectOpen",
      "msg": "A defect is already open"
    },
    {
      "code": 6009,
      "name": "noDefect",
      "msg": "No open defect"
    },
    {
      "code": 6010,
      "name": "badDefectAmount",
      "msg": "Defect amount must be positive and not exceed the locked retention"
    },
    {
      "code": 6011,
      "name": "notForSale",
      "msg": "Claim is not for sale"
    },
    {
      "code": 6012,
      "name": "priceChanged",
      "msg": "Price changed, transaction cancelled"
    },
    {
      "code": 6013,
      "name": "alreadyOwner",
      "msg": "Buyer already owns the claim"
    },
    {
      "code": 6014,
      "name": "badParties",
      "msg": "Client, subcontractor and arbiter must be three different wallets"
    },
    {
      "code": 6015,
      "name": "badArbiterWindow",
      "msg": "Arbiter window must be positive and at most one year"
    },
    {
      "code": 6016,
      "name": "notProposed",
      "msg": "Contract has not been proposed or was already accepted"
    },
    {
      "code": 6017,
      "name": "vaultChanged",
      "msg": "The vault holds less unfrozen money than the buyer expected"
    },
    {
      "code": 6018,
      "name": "unsafeMint",
      "msg": "This token has extensions that can break the vault (fees, hooks, delegates)"
    }
  ],
  "types": [
    {
      "name": "claimListed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "contract",
            "type": "pubkey"
          },
          {
            "name": "price",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "claimSold",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "contract",
            "type": "pubkey"
          },
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "buyer",
            "type": "pubkey"
          },
          {
            "name": "price",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "contract",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "client",
            "type": "pubkey"
          },
          {
            "name": "subcontractor",
            "type": "pubkey"
          },
          {
            "name": "beneficiary",
            "docs": [
              "Who receives the retention at release. Starts as the subcontractor,",
              "changes when the claim is sold."
            ],
            "type": "pubkey"
          },
          {
            "name": "arbiter",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "contractId",
            "type": "u64"
          },
          {
            "name": "retentionBps",
            "type": "u16"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "arbiterWindowSecs",
            "type": "i64"
          },
          {
            "name": "warrantyEnd",
            "type": "i64"
          },
          {
            "name": "totalPaid",
            "type": "u64"
          },
          {
            "name": "retained",
            "type": "u64"
          },
          {
            "name": "frozen",
            "type": "u64"
          },
          {
            "name": "paidOutToClient",
            "type": "u64"
          },
          {
            "name": "released",
            "type": "u64"
          },
          {
            "name": "defectHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "askPrice",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "status"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "title",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "contractAccepted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "contract",
            "type": "pubkey"
          },
          {
            "name": "subcontractor",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "contractCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "contract",
            "type": "pubkey"
          },
          {
            "name": "client",
            "type": "pubkey"
          },
          {
            "name": "subcontractor",
            "type": "pubkey"
          },
          {
            "name": "retentionBps",
            "type": "u16"
          },
          {
            "name": "warrantyEnd",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "defectRaised",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "contract",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "evidenceHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "defectResolved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "contract",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "paidClient",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "progressPaid",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "contract",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "toSubcontractor",
            "type": "u64"
          },
          {
            "name": "retained",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "released",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "contract",
            "type": "pubkey"
          },
          {
            "name": "beneficiary",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "triggeredBy",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "status",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "proposed"
          },
          {
            "name": "active"
          },
          {
            "name": "released"
          }
        ]
      }
    }
  ]
};
