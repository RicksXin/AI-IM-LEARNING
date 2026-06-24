package flashauth

import "testing"

func TestQuoteMySQLIdentifierRejectsUnsafeNames(t *testing.T) {
	if _, err := quoteMySQLIdentifier("flash-im"); err == nil {
		t.Fatal("quoteMySQLIdentifier should reject unsafe database names")
	}

	value, err := quoteMySQLIdentifier("flash_im")
	if err != nil {
		t.Fatalf("quoteMySQLIdentifier returned error: %v", err)
	}
	if value != "`flash_im`" {
		t.Fatalf("quoted identifier = %q, want `flash_im`", value)
	}
}
