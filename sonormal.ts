/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/sonormal.json`.
 */
export type Sonormal = {
  "address": "EUBUDsfBubKuFcXL5vpBPz2YFwLJjvjt42ZAMLfNLdTB",
  "metadata": {
    "name": "sonormal",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "buy",
      "discriminator": [
        102,
        6,
        61,
        18,
        1,
        218,
        235,
        234
      ],
      "accounts": [
        {
          "name": "buyerAuthority",
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "liquidityMint",
          "writable": true
        },
        {
          "name": "marketPoolAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  77,
                  65,
                  82,
                  75,
                  69,
                  84,
                  95,
                  80,
                  79,
                  79,
                  76
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "buyerAta",
          "writable": true
        },
        {
          "name": "protocolFeeReceiverAta",
          "writable": true
        },
        {
          "name": "marketFeeReceiverAta",
          "writable": true
        },
        {
          "name": "controller",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  67,
                  79,
                  78,
                  84,
                  82,
                  79,
                  76,
                  76,
                  69,
                  82
                ]
              }
            ]
          }
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  77,
                  65,
                  82,
                  75,
                  69,
                  84
                ]
              },
              {
                "kind": "arg",
                "path": "marketId"
              }
            ]
          }
        },
        {
          "name": "ticket",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  84,
                  73,
                  67,
                  75,
                  69,
                  84
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "market.total_tickets",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "marketId",
          "type": "u64"
        },
        {
          "name": "coefficients",
          "type": {
            "vec": "f64"
          }
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "claim",
      "discriminator": [
        62,
        198,
        214,
        193,
        213,
        159,
        108,
        210
      ],
      "accounts": [
        {
          "name": "claimerAuthority",
          "signer": true
        },
        {
          "name": "marketAuthority",
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "liquidityMint",
          "writable": true
        },
        {
          "name": "marketPoolAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  77,
                  65,
                  82,
                  75,
                  69,
                  84,
                  95,
                  80,
                  79,
                  79,
                  76
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "claimerAta",
          "writable": true
        },
        {
          "name": "protocolFeeReceiverAta",
          "writable": true
        },
        {
          "name": "marketFeeReceiverAta",
          "writable": true
        },
        {
          "name": "controller",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  67,
                  79,
                  78,
                  84,
                  82,
                  79,
                  76,
                  76,
                  69,
                  82
                ]
              }
            ]
          }
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  77,
                  65,
                  82,
                  75,
                  69,
                  84
                ]
              },
              {
                "kind": "arg",
                "path": "marketId"
              }
            ]
          }
        },
        {
          "name": "ticket",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  84,
                  73,
                  67,
                  75,
                  69,
                  84
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "arg",
                "path": "ticketId"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "marketId",
          "type": "u64"
        },
        {
          "name": "ticketId",
          "type": "u64"
        },
        {
          "name": "payout",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeController",
      "discriminator": [
        137,
        255,
        100,
        190,
        201,
        247,
        241,
        81
      ],
      "accounts": [
        {
          "name": "controllerAuthority",
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "feeReceiverAuthority"
        },
        {
          "name": "controller",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  67,
                  79,
                  78,
                  84,
                  82,
                  79,
                  76,
                  76,
                  69,
                  82
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "protocolFee",
          "type": "u16"
        }
      ]
    },
    {
      "name": "newMarket",
      "discriminator": [
        225,
        17,
        229,
        149,
        222,
        113,
        43,
        226
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "marketAuthority"
        },
        {
          "name": "liquidityMint"
        },
        {
          "name": "marketPoolAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  77,
                  65,
                  82,
                  75,
                  69,
                  84,
                  95,
                  80,
                  79,
                  79,
                  76
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "feeReceiverAta",
          "writable": true
        },
        {
          "name": "controller",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  67,
                  79,
                  78,
                  84,
                  82,
                  79,
                  76,
                  76,
                  69,
                  82
                ]
              }
            ]
          }
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  77,
                  65,
                  82,
                  75,
                  69,
                  84
                ]
              },
              {
                "kind": "account",
                "path": "controller.total_markets",
                "account": "controller"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "marketFee",
          "type": "u16"
        },
        {
          "name": "alpha",
          "type": {
            "vec": "f64"
          }
        },
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "marketParams"
            }
          }
        },
        {
          "name": "expiry",
          "type": "i64"
        }
      ]
    },
    {
      "name": "sell",
      "discriminator": [
        51,
        230,
        133,
        164,
        1,
        127,
        131,
        173
      ],
      "accounts": [
        {
          "name": "sellerAuthority",
          "signer": true
        },
        {
          "name": "marketAuthority",
          "signer": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "liquidityMint",
          "writable": true
        },
        {
          "name": "marketPoolAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  77,
                  65,
                  82,
                  75,
                  69,
                  84,
                  95,
                  80,
                  79,
                  79,
                  76
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "sellerAta",
          "writable": true
        },
        {
          "name": "protocolFeeReceiverAta",
          "writable": true
        },
        {
          "name": "marketFeeReceiverAta",
          "writable": true
        },
        {
          "name": "controller",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  67,
                  79,
                  78,
                  84,
                  82,
                  79,
                  76,
                  76,
                  69,
                  82
                ]
              }
            ]
          }
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  77,
                  65,
                  82,
                  75,
                  69,
                  84
                ]
              },
              {
                "kind": "arg",
                "path": "marketId"
              }
            ]
          }
        },
        {
          "name": "ticket",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  84,
                  73,
                  67,
                  75,
                  69,
                  84
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "arg",
                "path": "ticketId"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "marketId",
          "type": "u64"
        },
        {
          "name": "ticketId",
          "type": "u64"
        },
        {
          "name": "claimAmount",
          "type": "f64"
        },
        {
          "name": "tStar",
          "type": "u64"
        },
        {
          "name": "alphaPrime",
          "type": {
            "vec": "f64"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "controller",
      "discriminator": [
        184,
        79,
        171,
        0,
        183,
        43,
        113,
        110
      ]
    },
    {
      "name": "market",
      "discriminator": [
        219,
        190,
        213,
        55,
        0,
        227,
        198,
        154
      ]
    },
    {
      "name": "ticket",
      "discriminator": [
        41,
        228,
        24,
        165,
        78,
        90,
        235,
        200
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidAlphaLength",
      "msg": "Invalid alpha length"
    },
    {
      "code": 6001,
      "name": "nonPositiveAlpha",
      "msg": "Non-positive alpha"
    },
    {
      "code": 6002,
      "name": "invalidDegree",
      "msg": "Invalid degree"
    },
    {
      "code": 6003,
      "name": "invalidBounds",
      "msg": "Invalid bounds"
    },
    {
      "code": 6004,
      "name": "floorsMustBeGreaterThanZero",
      "msg": "Floors must be greater than zero"
    },
    {
      "code": 6005,
      "name": "simplexOutOfTolerance",
      "msg": "Simplex out of tolerance"
    },
    {
      "code": 6006,
      "name": "invalidExpiry",
      "msg": "Expiry must be in the future"
    },
    {
      "code": 6007,
      "name": "feeTooHigh",
      "msg": "Fee must be less than 100 basis points"
    },
    {
      "code": 6008,
      "name": "marketSettled",
      "msg": "Market settled"
    },
    {
      "code": 6009,
      "name": "marketExpired",
      "msg": "Market expired"
    },
    {
      "code": 6010,
      "name": "marketStillOnGoing",
      "msg": "Market still on going"
    },
    {
      "code": 6011,
      "name": "zeroCollateralAmount",
      "msg": "Zero collateral amount"
    }
  ],
  "types": [
    {
      "name": "controller",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "protocolFee",
            "type": "u16"
          },
          {
            "name": "feeReceiverAuthority",
            "type": "pubkey"
          },
          {
            "name": "totalMarkets",
            "type": "u64"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          }
        ]
      }
    },
    {
      "name": "market",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "liquidityMint",
            "type": "pubkey"
          },
          {
            "name": "poolAta",
            "type": "pubkey"
          },
          {
            "name": "totalPoolAmount",
            "type": "u64"
          },
          {
            "name": "marketFee",
            "type": "u16"
          },
          {
            "name": "feeReceiverAta",
            "type": "pubkey"
          },
          {
            "name": "totalTickets",
            "type": "u64"
          },
          {
            "name": "alpha",
            "type": {
              "vec": "f64"
            }
          },
          {
            "name": "params",
            "type": {
              "defined": {
                "name": "marketParams"
              }
            }
          },
          {
            "name": "precomp",
            "type": {
              "defined": {
                "name": "marketPrecomp"
              }
            }
          },
          {
            "name": "expiry",
            "type": "i64"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          }
        ]
      }
    },
    {
      "name": "marketParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "k",
            "type": "bytes"
          },
          {
            "name": "l",
            "type": "f64"
          },
          {
            "name": "h",
            "type": "f64"
          },
          {
            "name": "unitMapKind",
            "type": {
              "defined": {
                "name": "unitMapKind"
              }
            }
          },
          {
            "name": "epsAlpha",
            "type": "f64"
          },
          {
            "name": "tolCoeffSum",
            "type": "f64"
          },
          {
            "name": "tolProbSum",
            "type": "f64"
          },
          {
            "name": "boundaryMarginEta",
            "type": "f64"
          },
          {
            "name": "epsDens",
            "type": "f64"
          },
          {
            "name": "muDefault",
            "type": "f64"
          }
        ]
      }
    },
    {
      "name": "marketPrecomp",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "delta",
            "type": "f64"
          },
          {
            "name": "binom",
            "type": {
              "vec": "f64"
            }
          },
          {
            "name": "cPdfX",
            "type": "f64"
          },
          {
            "name": "logBinom",
            "type": {
              "vec": "f64"
            }
          }
        ]
      }
    },
    {
      "name": "ticket",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "coefficients",
            "type": {
              "vec": "f64"
            }
          },
          {
            "name": "claim",
            "type": "f64"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          }
        ]
      }
    },
    {
      "name": "unitMapKind",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "linear"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "controllerNamespace",
      "type": "bytes",
      "value": "[67, 79, 78, 84, 82, 79, 76, 76, 69, 82]"
    }
  ]
};
