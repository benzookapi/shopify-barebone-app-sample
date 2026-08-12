use crate::schema;
use shopify_function::prelude::*;
use shopify_function::Result;

#[shopify_function]
fn cart_transform_run(
    input: schema::cart_transform_run::Input,
) -> Result<schema::CartTransformRunResult> {
    let no_changes = schema::CartTransformRunResult { operations: vec![] };

    let percentage = input
        .cart()
        .buyer_identity()
        .and_then(|identity| identity.customer())
        .and_then(|customer| customer.metafield())
        .map(|metafield| metafield.value())
        .and_then(|value| value.parse::<f64>().ok())
        .filter(|value| *value > 0.0 && *value <= 100.0);

    let Some(percentage) = percentage else {
        return Ok(no_changes);
    };

    let multiplier = 1.0 + percentage / 100.0;
    let operations = input
        .cart()
        .lines()
        .iter()
        .filter(|line| line.selling_plan_allocation().is_none())
        .map(|line| {
            let amount = line.cost().amount_per_quantity().amount().0 * multiplier;

            schema::Operation::LineUpdate(schema::LineUpdateOperation {
                cart_line_id: line.id().clone(),
                price: Some(schema::LineUpdateOperationPriceAdjustment {
                    adjustment: schema::LineUpdateOperationPriceAdjustmentValue::FixedPricePerUnit(
                        schema::LineUpdateOperationFixedPricePerUnitAdjustment {
                            amount: Decimal(amount),
                        },
                    ),
                }),
                title: None,
                image: None,
            })
        })
        .collect();

    Ok(schema::CartTransformRunResult { operations })
}

#[cfg(test)]
mod tests {
    use super::*;
    use shopify_function::{run_function_with_input, Result};

    #[test]
    fn increases_each_eligible_line_by_the_customer_percentage() -> Result<()> {
        let result = run_function_with_input(
            cart_transform_run,
            r#"{
                "cart": {
                    "lines": [
                        {
                            "id": "gid://shopify/CartLine/1",
                            "cost": { "amountPerQuantity": { "amount": "100.0" } },
                            "sellingPlanAllocation": null
                        },
                        {
                            "id": "gid://shopify/CartLine/2",
                            "cost": { "amountPerQuantity": { "amount": "20.0" } },
                            "sellingPlanAllocation": null
                        }
                    ],
                    "buyerIdentity": {
                        "customer": { "metafield": { "value": "30" } }
                    }
                }
            }"#,
        )?;

        assert_eq!(result.operations.len(), 2);
        assert_eq!(
            result.operations[0],
            schema::Operation::LineUpdate(schema::LineUpdateOperation {
                cart_line_id: "gid://shopify/CartLine/1".to_string(),
                price: Some(schema::LineUpdateOperationPriceAdjustment {
                    adjustment: schema::LineUpdateOperationPriceAdjustmentValue::FixedPricePerUnit(
                        schema::LineUpdateOperationFixedPricePerUnitAdjustment {
                            amount: Decimal(130.0),
                        },
                    ),
                }),
                title: None,
                image: None,
            })
        );
        assert_eq!(
            result.operations[1],
            schema::Operation::LineUpdate(schema::LineUpdateOperation {
                cart_line_id: "gid://shopify/CartLine/2".to_string(),
                price: Some(schema::LineUpdateOperationPriceAdjustment {
                    adjustment: schema::LineUpdateOperationPriceAdjustmentValue::FixedPricePerUnit(
                        schema::LineUpdateOperationFixedPricePerUnitAdjustment {
                            amount: Decimal(26.0),
                        },
                    ),
                }),
                title: None,
                image: None,
            })
        );
        Ok(())
    }

    #[test]
    fn skips_lines_with_selling_plans() -> Result<()> {
        let result = run_function_with_input(
            cart_transform_run,
            r#"{
                "cart": {
                    "lines": [
                        {
                            "id": "gid://shopify/CartLine/1",
                            "cost": { "amountPerQuantity": { "amount": "100.0" } },
                            "sellingPlanAllocation": {
                                "sellingPlan": { "id": "gid://shopify/SellingPlan/1" }
                            }
                        }
                    ],
                    "buyerIdentity": {
                        "customer": { "metafield": { "value": "30" } }
                    }
                }
            }"#,
        )?;

        assert!(result.operations.is_empty());
        Ok(())
    }

    #[test]
    fn returns_no_changes_without_an_authenticated_customer_value() -> Result<()> {
        for buyer_identity in ["null", r#"{"customer":{"metafield":null}}"#] {
            let input = format!(
                r#"{{
                    "cart": {{
                        "lines": [{{
                            "id": "gid://shopify/CartLine/1",
                            "cost": {{ "amountPerQuantity": {{ "amount": "100.0" }} }},
                            "sellingPlanAllocation": null
                        }}],
                        "buyerIdentity": {buyer_identity}
                    }}
                }}"#
            );
            let result = run_function_with_input(cart_transform_run, &input)?;
            assert!(result.operations.is_empty());
        }
        Ok(())
    }

    #[test]
    fn returns_no_changes_for_invalid_percentages() -> Result<()> {
        for percentage in ["0", "101", "not-a-number"] {
            let input = format!(
                r#"{{
                    "cart": {{
                        "lines": [{{
                            "id": "gid://shopify/CartLine/1",
                            "cost": {{ "amountPerQuantity": {{ "amount": "100.0" }} }},
                            "sellingPlanAllocation": null
                        }}],
                        "buyerIdentity": {{
                            "customer": {{ "metafield": {{ "value": "{percentage}" }} }}
                        }}
                    }}
                }}"#
            );
            let result = run_function_with_input(cart_transform_run, &input)?;
            assert!(result.operations.is_empty());
        }
        Ok(())
    }
}
