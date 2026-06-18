package main

import "testing"

func TestAuthStoreContractSMSLoginCreatesAccountWithoutPassword(t *testing.T) {
	store := newAuthMemoryStore()
	phone := "13800009999"

	if err := store.saveSMSCode(phone, "123456"); err != nil {
		t.Fatalf("save sms: %v", err)
	}

	ok, err := store.verifySMSCode(phone, "123456")
	if err != nil {
		t.Fatalf("verify sms: %v", err)
	}
	if !ok {
		t.Fatal("sms code should be valid")
	}

	user, err := store.findOrCreateUserByPhone(phone)
	if err != nil {
		t.Fatalf("find or create user: %v", err)
	}

	hasPassword, err := store.hasPassword(user.UserID)
	if err != nil {
		t.Fatalf("has password: %v", err)
	}
	if hasPassword {
		t.Fatal("sms-created account should not have password")
	}
}

func TestAuthStoreContractPasswordLifecycle(t *testing.T) {
	store := newAuthMemoryStore()
	phone := "13800009998"

	user, err := store.findOrCreateUserByPhone(phone)
	if err != nil {
		t.Fatalf("find or create user: %v", err)
	}

	if err := store.setInitialPassword(user.UserID, "first123"); err != nil {
		t.Fatalf("set initial password: %v", err)
	}

	if err := store.setInitialPassword(user.UserID, "second123"); err == nil {
		t.Fatal("set initial password should reject accounts that already have a password")
	}

	authenticated, ok, err := store.authenticatePassword(phone, "first123")
	if err != nil {
		t.Fatalf("authenticate password: %v", err)
	}
	if !ok {
		t.Fatal("password login should succeed after setup")
	}
	if authenticated.UserID != user.UserID {
		t.Fatalf("authenticated user_id = %q, want %q", authenticated.UserID, user.UserID)
	}

	if err := store.changePassword(user.UserID, "wrong-password", "next123"); err == nil {
		t.Fatal("change password should reject wrong old password")
	}

	if err := store.changePassword(user.UserID, "first123", "next123"); err != nil {
		t.Fatalf("change password: %v", err)
	}

	if _, ok, err := store.authenticatePassword(phone, "first123"); err != nil || ok {
		t.Fatalf("old password ok = %v, err = %v; want failed login", ok, err)
	}

	if _, ok, err := store.authenticatePassword(phone, "next123"); err != nil || !ok {
		t.Fatalf("new password ok = %v, err = %v; want successful login", ok, err)
	}
}
