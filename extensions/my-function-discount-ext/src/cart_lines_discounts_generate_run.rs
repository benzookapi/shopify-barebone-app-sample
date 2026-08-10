use crate::schema;
use shopify_function::prelude::*;
use shopify_function::Result;

#[shopify_function]
fn cart_lines_discounts_generate_run(
    input: schema::cart_lines_discounts_generate_run::Input,
) -> Result<schema::CartLinesDiscountsGenerateRunResult> {
    let no_discount = schema::CartLinesDiscountsGenerateRunResult { operations: vec![] };

    if !input
        .discount()
        .discount_classes()
        .contains(&schema::DiscountClass::Order)
    {
        return Ok(no_discount);
    }

    let percentage = input
        .cart()
        .attribute()
        .and_then(|attribute| attribute.value())
        .or_else(|| {
            input
                .cart()
                .buyer_identity()
                .and_then(|identity| identity.customer())
                .and_then(|customer| customer.metafield())
                .map(|metafield| metafield.value())
        })
        .and_then(|value| value.parse::<f64>().ok())
        .filter(|value| *value > 0.0 && *value <= 100.0);

    let Some(percentage) = percentage else {
        return Ok(no_discount);
    };

    Ok(schema::CartLinesDiscountsGenerateRunResult {
        operations: vec![schema::CartOperation::OrderDiscountsAdd(
            schema::OrderDiscountsAddOperation {
                selection_strategy: schema::OrderDiscountSelectionStrategy::First,
                candidates: vec![schema::OrderDiscountCandidate {
                    targets: vec![schema::OrderDiscountCandidateTarget::OrderSubtotal(
                        schema::OrderSubtotalTarget {
                            excluded_cart_line_ids: vec![],
                        },
                    )],
                    message: Some("Function order discount worked!".to_string()),
                    value: schema::OrderDiscountCandidateValue::Percentage(schema::Percentage {
                        value: Decimal(percentage),
                    }),
                    conditions: None,
                    associated_discount_code: None,
                }],
            },
        )],
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use shopify_function::run_function_with_input;

    #[test]
    fn returns_customer_percentage_as_an_order_discount() -> Result<()> {
        let result = run_function_with_input(
            cart_lines_discounts_generate_run,
            r#"{
                "cart": {
                    "attribute": null,
                    "buyerIdentity": {
                        "customer": {
                            "metafield": { "value": "30" }
                        }
                    }
                },
                "discount": { "discountClasses": ["ORDER"] }
            }"#,
        )?;

        assert_eq!(
            result,
            schema::CartLinesDiscountsGenerateRunResult {
                operations: vec![schema::CartOperation::OrderDiscountsAdd(
                    schema::OrderDiscountsAddOperation {
                        selection_strategy: schema::OrderDiscountSelectionStrategy::First,
                        candidates: vec![schema::OrderDiscountCandidate {
                            targets: vec![schema::OrderDiscountCandidateTarget::OrderSubtotal(
                                schema::OrderSubtotalTarget {
                                    excluded_cart_line_ids: vec![],
                                },
                            ),],
                            message: Some("Function order discount worked!".to_string()),
                            value: schema::OrderDiscountCandidateValue::Percentage(
                                schema::Percentage {
                                    value: Decimal(30.0),
                                },
                            ),
                            conditions: None,
                            associated_discount_code: None,
                        }],
                    },
                )],
            }
        );
        Ok(())
    }

    #[test]
    fn returns_no_discount_without_a_valid_percentage() -> Result<()> {
        let result = run_function_with_input(
            cart_lines_discounts_generate_run,
            r#"{
                "cart": { "attribute": null, "buyerIdentity": null },
                "discount": { "discountClasses": ["ORDER"] }
            }"#,
        )?;

        assert!(result.operations.is_empty());
        Ok(())
    }
}
